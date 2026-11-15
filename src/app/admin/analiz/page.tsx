import { requireAdminData } from '@/lib/admin-loader'
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const data = await requireAdminData()
  return (
    <AdminAnalyticsClient
      admin={data.admin}
      survey={data.survey}
      responses={data.responses}
      totalGraduates={data.graduates.length}
    />
  )
}
