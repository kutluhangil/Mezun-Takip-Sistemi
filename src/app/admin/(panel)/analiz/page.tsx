import { loadAnalytics } from '@/lib/admin-loader'
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const data = await loadAnalytics()
  return <AdminAnalyticsClient {...data} />
}
