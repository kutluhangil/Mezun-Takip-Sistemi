import { requireAdminData } from '@/lib/admin-loader'
import { AdminResponsesClient } from '@/components/admin/AdminResponsesClient'

export const dynamic = 'force-dynamic'

export default async function AdminResponsesPage() {
  const data = await requireAdminData()
  return (
    <AdminResponsesClient
      admin={data.admin}
      survey={data.survey}
      responses={data.responses}
    />
  )
}
