import { NextResponse } from 'next/server'
import { replaceAnswers } from '@/lib/answers-store'
import { getGraduateSession } from '@/lib/auth'
import { isUniqueViolation, withTransaction } from '@/lib/db'
import { handleRouteError, jsonError, readJson } from '@/lib/http'
import { getActiveSurvey } from '@/lib/server-data'
import { eligibilityFor, sanitizeAnswers, validateSurveyAnswers } from '@/lib/survey-validation'
import type { AnswerMap, Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

class NotEligible extends Error {}

export async function POST(req: Request) {
  const graduate = await getGraduateSession()
  if (!graduate) return jsonError(401, 'unauthorized')

  try {
    const body = await readJson<{ answers?: unknown; lang?: string }>(req, 64 * 1024)
    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const survey = await getActiveSurvey()

    const answers: AnswerMap = {
      ...sanitizeAnswers(survey.definition, body.answers),
      q_full_name: graduate.full_name,
      q_email: graduate.email,
    }

    const errors = validateSurveyAnswers(survey.definition, answers, lang)
    if (errors.length > 0) return jsonError(400, 'validation_failed', { errors })

    const result = await withTransaction(async (client) => {
      // Mezun satırı kilitlenir: aynı mezunun paralel gönderimleri sıraya girer,
      // uygunluk ve sıra numarası kilit altında okunur.
      await client.query(`SELECT id FROM graduates WHERE id = $1 FOR UPDATE`, [graduate.id])
      const hist = await client.query<{ period_key: string; submitted_at: string; n: number }>(
        `SELECT period_key, submitted_at::text,
                (SELECT COUNT(*)::int FROM responses
                 WHERE survey_id = $1 AND graduate_id = $2 AND status = 'submitted') AS n
         FROM responses
         WHERE survey_id = $1 AND graduate_id = $2 AND status = 'submitted'
         ORDER BY submitted_at DESC LIMIT 1`,
        [survey.id, graduate.id]
      )
      const latest = hist.rows[0]
      const eligibility = eligibilityFor(survey, latest)
      if (!eligibility.allowed) throw new NotEligible(eligibility.reason ?? 'not_eligible')
      const submissionNumber = (latest?.n ?? 0) + 1

      const q = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
      const term = answers.q_grad_term
      await client.query(
        `UPDATE graduates
         SET student_number = COALESCE($2, student_number),
             graduation_year = COALESCE($3, graduation_year),
             graduation_term = COALESCE($4, graduation_term),
             updated_at = NOW()
         WHERE id = $1`,
        [
          graduate.id,
          q(answers.q_student_number),
          typeof answers.q_grad_year === 'number' ? answers.q_grad_year : null,
          term && typeof term === 'object' && 'choice' in term ? term.choice : null,
        ]
      )

      const res = await client.query<{ id: string }>(
        `WITH promoted AS (
           UPDATE responses
           SET status = 'submitted', period_key = $3, submission_number = $4,
               submitted_at = NOW(), updated_at = NOW()
           WHERE survey_id = $1 AND graduate_id = $2 AND status = 'draft'
           RETURNING id
         ), inserted AS (
           INSERT INTO responses (survey_id, graduate_id, period_key, submission_number, status, submitted_at)
           SELECT $1, $2, $3, $4, 'submitted', NOW()
           WHERE NOT EXISTS (SELECT 1 FROM promoted)
           RETURNING id
         )
         SELECT id FROM promoted UNION ALL SELECT id FROM inserted`,
        [survey.id, graduate.id, survey.active_period, submissionNumber]
      )
      const responseId = res.rows[0].id
      await replaceAnswers(client, responseId, answers)
      return { responseId, submissionNumber }
    })

    return NextResponse.json({
      ok: true,
      responseId: result.responseId,
      periodKey: survey.active_period,
      submissionNumber: result.submissionNumber,
      redirectTo: `/tesekkurler?period=${encodeURIComponent(survey.active_period)}&n=${result.submissionNumber}`,
    })
  } catch (err) {
    if (err instanceof NotEligible) return jsonError(403, err.message)
    if (isUniqueViolation(err)) return jsonError(409, 'already_submitted')
    return handleRouteError('survey/submit', err, 'Anket gönderilemedi.')
  }
}
