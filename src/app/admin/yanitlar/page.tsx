import { requireAdmin } from '@/lib/admin-loader'
import { getActiveSurvey, getSubmittedResponses } from '@/lib/server-data'
import { AdminResponsesClient } from '@/components/admin/AdminResponsesClient'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage() {
  const admin = await requireAdmin()
  const survey = await getActiveSurvey()
  const responses = await getSubmittedResponses(survey.id)
  return <AdminResponsesClient admin={admin} survey={survey} responses={responses} />
}
