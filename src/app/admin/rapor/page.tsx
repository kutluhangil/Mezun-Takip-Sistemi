import { requireAdminData } from '@/lib/admin-loader'
import { AdminReportsClient } from '@/components/admin/AdminReportsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const data = await requireAdminData()
  return (
    <AdminReportsClient
      admin={data.admin}
      survey={data.survey}
      responses={data.responses}
      totalGraduates={data.graduates.length}
    />
  )
}
