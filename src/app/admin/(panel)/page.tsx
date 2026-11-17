import { loadAnalytics } from '@/lib/admin-loader'
import { AdminOverviewClient } from '@/components/admin/AdminOverviewClient'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const data = await loadAnalytics()
  return <AdminOverviewClient {...data} />
}
