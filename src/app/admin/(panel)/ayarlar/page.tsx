import { requireAdmin } from '@/lib/admin-loader'
import { recentAudit } from '@/lib/audit'
import { getActiveSurvey, getAppSettings, listAdmins } from '@/lib/server-data'
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const admin = await requireAdmin()
  const owner = admin.role === 'owner'
  const [survey, settings, admins, auditLog] = await Promise.all([
    getActiveSurvey(),
    getAppSettings(),
    owner ? listAdmins() : Promise.resolve([]),
    owner ? recentAudit(60) : Promise.resolve([]),
  ])
  return <AdminSettingsClient admin={admin} survey={survey} settings={settings} admins={admins} auditLog={auditLog} />
}
