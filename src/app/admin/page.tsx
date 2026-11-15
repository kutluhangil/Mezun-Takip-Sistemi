import { requireAdminData } from '@/lib/admin-loader'
import { AdminOverviewClient } from '@/components/admin/AdminOverviewClient'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const data = await requireAdminData()
  return (
    <AdminOverviewClient
      admin={data.admin}
      survey={data.survey}
      responses={data.responses}
      totalGraduates={data.graduates.length}
    />
  )
}
