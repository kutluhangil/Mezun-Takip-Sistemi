import { redirect } from 'next/navigation'
import { getGraduateSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getActiveSurvey, getGraduateLatestSubmission } from '@/lib/server-data'
import { checkSubmissionEligibility } from '@/lib/survey-validation'
import type { AnswerMap, AnswerValue } from '@/lib/survey-types'
import { SurveyClient } from '@/components/survey/SurveyClient'

export const dynamic = 'force-dynamic'

export default async function SurveyPage() {
  const graduate = await getGraduateSession()
  if (!graduate) {
    redirect('/giris')
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

  const draftRes = await query<{ answers: Record<string, AnswerValue> | null }>(
    `SELECT COALESCE(jsonb_object_agg(a.question_id, a.value) FILTER (WHERE a.question_id IS NOT NULL), '{}'::jsonb) AS answers
     FROM responses r
     LEFT JOIN answers a ON a.response_id = r.id
     WHERE r.survey_id = $1 AND r.graduate_id = $2 AND r.status = 'draft'
     GROUP BY r.id
     LIMIT 1`,
    [survey.id, graduate.id]
  )

  return (
    <SurveyClient
      graduate={graduate}
      survey={survey}
      eligibility={eligibility}
      history={history}
      draftAnswers={(draftRes.rows[0]?.answers as AnswerMap | null) ?? null}
    />
  )
}
