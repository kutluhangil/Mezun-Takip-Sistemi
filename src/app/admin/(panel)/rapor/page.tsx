import { loadAnalytics } from '@/lib/admin-loader'
import { AdminReportsClient } from '@/components/admin/AdminReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const data = await loadAnalytics()
  return <AdminReportsClient {...data} />
}
