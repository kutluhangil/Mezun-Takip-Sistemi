import { requireAdmin } from '@/lib/admin-loader'
import { getActiveSurvey, getSubmittedResponses } from '@/lib/server-data'
import { AdminResponsesClient } from '@/components/admin/AdminResponsesClient'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage() {
  const [, survey] = await Promise.all([requireAdmin(), getActiveSurvey()])
  const responses = await getSubmittedResponses(survey.id)
  return <AdminResponsesClient survey={survey} responses={responses} />
}
