import { redirect } from 'next/navigation'
import { getGraduateSession } from '@/lib/auth'
import { getActiveSurvey, getAppSettings, getDraft, getLatestConsentVersion, getSubmissionHistory } from '@/lib/server-data'
import { eligibilityFor } from '@/lib/survey-validation'
import { SurveyClient } from '@/components/survey/SurveyClient'

export const dynamic = 'force-dynamic'

export default async function SurveyPage() {
  const graduate = await getGraduateSession()
  if (!graduate) redirect('/giris')

  const survey = await getActiveSurvey()
  const [history, draft, settings, consentVersion] = await Promise.all([
    getSubmissionHistory(survey.id, graduate.id),
    getDraft(survey.id, graduate.id),
    getAppSettings(),
    getLatestConsentVersion(graduate.id),
  ])

  return (
    <SurveyClient
      graduate={graduate}
      survey={survey}
      eligibility={eligibilityFor(survey, history[0])}
      history={history}
      draftAnswers={draft?.answers ?? null}
      kvkk={consentVersion === settings.kvkkNotice.version ? null : settings.kvkkNotice}
    />
  )
}
