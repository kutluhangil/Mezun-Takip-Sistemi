import { requireAdmin } from '@/lib/admin-loader'
import { getActiveSurvey, getAppSettings, getGraduatesWithStatus } from '@/lib/server-data'
import { AdminGraduatesClient } from '@/components/admin/AdminGraduatesClient'

export const dynamic = 'force-dynamic'

export default async function AdminGraduatesPage() {
  const admin = await requireAdmin()
  const survey = await getActiveSurvey()
  const [settings, graduates] = await Promise.all([getAppSettings(), getGraduatesWithStatus(survey.id, survey.active_period)])
  return <AdminGraduatesClient admin={admin} survey={survey} settings={settings} graduates={graduates} />
}
