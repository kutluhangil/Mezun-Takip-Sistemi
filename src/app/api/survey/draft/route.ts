import { NextResponse } from 'next/server'
import { getGraduateSession } from '@/lib/auth'
import { query, rawPool } from '@/lib/db'
import { getActiveSurvey, getGraduateLatestSubmission } from '@/lib/server-data'
import { checkSubmissionEligibility } from '@/lib/survey-validation'
import type { AnswerMap, AnswerValue } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const graduate = await getGraduateSession()
  if (!graduate) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const survey = await getActiveSurvey()
  const history = await getGraduateLatestSubmission(survey.id, graduate.id)
  const latest = history[0]
  const eligibility = checkSubmissionEligibility({
    isOpen: survey.is_open,
    repeatMode: survey.repeat_mode,
    activePeriod: survey.active_period,
    cooldownDays: survey.cooldown_days,
    latestSubmittedAt: latest?.submitted_at ?? null,
    latestPeriodKey: latest?.period_key ?? null,
  })

  const draftRes = await query<{
    id: string
    answers: Record<string, AnswerValue> | null
    updated_at: string
  }>(
    `SELECT
       r.id,
       r.updated_at::text,
       COALESCE(jsonb_object_agg(a.question_id, a.value) FILTER (WHERE a.question_id IS NOT NULL), '{}'::jsonb) AS answers
     FROM responses r
     LEFT JOIN answers a ON a.response_id = r.id
     WHERE r.survey_id = $1 AND r.graduate_id = $2 AND r.status = 'draft'
     GROUP BY r.id
     LIMIT 1`,
    [survey.id, graduate.id]
  )

  return NextResponse.json({
    graduate,
    survey,
    eligibility,
    history,
    draftAnswers: draftRes.rows[0]?.answers ?? null,
    draftUpdatedAt: draftRes.rows[0]?.updated_at ?? null,
  })
}

export async function PUT(req: Request) {
  const graduate = await getGraduateSession()
  if (!graduate) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { answers?: AnswerMap }
    const answers = body.answers ?? {}
    const survey = await getActiveSurvey()

    const history = await getGraduateLatestSubmission(survey.id, graduate.id)
    const latest = history[0]
    const eligibility = checkSubmissionEligibility({
      isOpen: survey.is_open,
      repeatMode: survey.repeat_mode,
      activePeriod: survey.active_period,
      cooldownDays: survey.cooldown_days,
      latestSubmittedAt: latest?.submitted_at ?? null,
      latestPeriodKey: latest?.period_key ?? null,
    })

    if (!eligibility.allowed) {
      return NextResponse.json({ error: eligibility.reason ?? 'not_eligible' }, { status: 403 })
    }

    const pool = await rawPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let draftRes = await client.query<{ id: string }>(
        `SELECT id FROM responses WHERE survey_id = $1 AND graduate_id = $2 AND status = 'draft' LIMIT 1`,
        [survey.id, graduate.id]
      )
      let responseId = draftRes.rows[0]?.id
      if (!responseId) {
        const nextNum = history.length + 1
        const ins = await client.query<{ id: string }>(
          `INSERT INTO responses (survey_id, graduate_id, period_key, submission_number, status)
           VALUES ($1, $2, $3, $4, 'draft')
           RETURNING id`,
          [survey.id, graduate.id, survey.active_period, nextNum]
        )
        responseId = ins.rows[0].id
      } else {
        await client.query(
          `UPDATE responses SET period_key = $2, updated_at = NOW() WHERE id = $1`,
          [responseId, survey.active_period]
        )
      }

      for (const [qId, val] of Object.entries(answers)) {
        if (val === undefined || val === null) continue
        await client.query(
          `INSERT INTO answers (response_id, question_id, value, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (response_id, question_id)
           DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [responseId, qId, JSON.stringify(val)]
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
  } catch (err) {
    console.error('[survey/draft PUT]', err)
    return NextResponse.json({ error: 'Taslak kaydedilemedi.' }, { status: 500 })
  }
}
