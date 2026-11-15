import { requireAdminData } from '@/lib/admin-loader'
import { AdminGraduatesClient } from '@/components/admin/AdminGraduatesClient'

export const dynamic = 'force-dynamic'

export default async function AdminGraduatesPage() {
  const data = await requireAdminData()
  return (
    <AdminGraduatesClient
      admin={data.admin}
      survey={data.survey}
      settings={data.settings}
      graduates={data.graduates}
      admins={data.admins}
    />
  )
}
