import { NextResponse } from 'next/server'
import { getGraduateSession } from '@/lib/auth'
import { rawPool } from '@/lib/db'
import { getActiveSurvey, getGraduateLatestSubmission } from '@/lib/server-data'
import { checkSubmissionEligibility, validateSurveyAnswers } from '@/lib/survey-validation'
import type { AnswerMap, Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const graduate = await getGraduateSession()
  if (!graduate) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as { answers?: AnswerMap; lang?: string }
    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const survey = await getActiveSurvey()

    const mergedAnswers: AnswerMap = {
      ...(body.answers ?? {}),
      q_full_name: graduate.full_name,
      q_email: graduate.email,
    }

    const errors = validateSurveyAnswers(survey.definition, mergedAnswers, lang)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 })
    }

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
    let submittedId: string
    const nextSubmissionNumber = history.length + 1

    try {
      await client.query('BEGIN')

      // Profil alanlarını son gönderilen öğrenci no/mezuniyet bilgileriyle zenginleştir
      const studentNo =
        typeof mergedAnswers.q_student_number === 'string' && mergedAnswers.q_student_number.trim()
          ? mergedAnswers.q_student_number.trim()
          : graduate.student_number
      const gradYear =
        typeof mergedAnswers.q_grad_year === 'number'
          ? mergedAnswers.q_grad_year
          : graduate.graduation_year
      const gradTermObj = mergedAnswers.q_grad_term
      const gradTerm =
        gradTermObj && typeof gradTermObj === 'object' && 'choice' in gradTermObj
          ? gradTermObj.choice
          : graduate.graduation_term

      await client.query(
        `UPDATE graduates
         SET student_number = COALESCE(NULLIF($2, ''), student_number),
             graduation_year = COALESCE($3, graduation_year),
             graduation_term = COALESCE($4, graduation_term),
             updated_at = NOW()
         WHERE id = $1`,
        [graduate.id, studentNo, gradYear, gradTerm]
      )

      const draftRes = await client.query<{ id: string }>(
        `SELECT id FROM responses WHERE survey_id = $1 AND graduate_id = $2 AND status = 'draft' LIMIT 1 FOR UPDATE`,
        [survey.id, graduate.id]
      )

      if (draftRes.rows[0]) {
        submittedId = draftRes.rows[0].id
        await client.query(
          `UPDATE responses
           SET status = 'submitted',
               period_key = $2,
               submission_number = $3,
               submitted_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [submittedId, survey.active_period, nextSubmissionNumber]
        )
      } else {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO responses (survey_id, graduate_id, period_key, submission_number, status, submitted_at)
           VALUES ($1, $2, $3, $4, 'submitted', NOW())
           RETURNING id`,
          [survey.id, graduate.id, survey.active_period, nextSubmissionNumber]
        )
        submittedId = ins.rows[0].id
      }

      for (const [qId, val] of Object.entries(mergedAnswers)) {
        if (val === undefined || val === null) continue
        await client.query(
          `INSERT INTO answers (response_id, question_id, value, updated_at)
           VALUES ($1, $2, $3::jsonb, NOW())
           ON CONFLICT (response_id, question_id)
           DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [submittedId, qId, JSON.stringify(val)]
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({
      ok: true,
      responseId: submittedId,
      periodKey: survey.active_period,
      submissionNumber: nextSubmissionNumber,
      redirectTo: `/tesekkurler?id=${encodeURIComponent(submittedId)}&period=${encodeURIComponent(
        survey.active_period
      )}&n=${nextSubmissionNumber}`,
    })
  } catch (err) {
    console.error('[survey/submit]', err)
    return NextResponse.json({ error: 'Anket gönderilemedi.' }, { status: 500 })
  }
}
