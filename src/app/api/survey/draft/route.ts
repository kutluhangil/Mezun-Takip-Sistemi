import { NextResponse } from 'next/server'
import { upsertAnswers } from '@/lib/answers-store'
import { getGraduateSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import { handleRouteError, jsonError, readJson } from '@/lib/http'
import { getActiveSurvey, getDraft, getSubmissionHistory } from '@/lib/server-data'
import { eligibilityFor, sanitizeAnswers } from '@/lib/survey-validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const graduate = await getGraduateSession()
  if (!graduate) return jsonError(401, 'unauthorized')

  const survey = await getActiveSurvey()
  const [history, draft] = await Promise.all([
    getSubmissionHistory(survey.id, graduate.id),
    getDraft(survey.id, graduate.id),
  ])

  return NextResponse.json({
    graduate,
    survey,
    eligibility: eligibilityFor(survey, history[0]),
    history,
    draftAnswers: draft?.answers ?? null,
    draftUpdatedAt: draft?.updated_at ?? null,
  })
}

export async function PUT(req: Request) {
  const graduate = await getGraduateSession()
  if (!graduate) return jsonError(401, 'unauthorized')

  try {
    const body = await readJson<{ answers?: unknown }>(req, 64 * 1024)
    const survey = await getActiveSurvey()
    const answers = sanitizeAnswers(survey.definition, body.answers)

    const history = await getSubmissionHistory(survey.id, graduate.id)
    const eligibility = eligibilityFor(survey, history[0])
    if (!eligibility.allowed) return jsonError(403, eligibility.reason ?? 'not_eligible')

    await withTransaction(async (client) => {
      // Tek aktif taslak: kısmi benzersiz index sayesinde yarışta da ikinci taslak oluşmaz
      const res = await client.query<{ id: string }>(
        `INSERT INTO responses (survey_id, graduate_id, period_key, submission_number, status)
         VALUES ($1, $2, $3, $4, 'draft')
         ON CONFLICT (survey_id, graduate_id) WHERE status = 'draft'
         DO UPDATE SET period_key = EXCLUDED.period_key, updated_at = NOW()
         RETURNING id`,
        [survey.id, graduate.id, survey.active_period, history.length + 1]
      )
      await upsertAnswers(client, res.rows[0].id, answers)
    })

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
  } catch (err) {
    return handleRouteError('survey/draft PUT', err, 'Taslak kaydedilemedi.')
  }
}
