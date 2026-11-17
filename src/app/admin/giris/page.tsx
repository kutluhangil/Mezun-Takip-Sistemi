import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { AdminLoginClient } from '@/components/admin/AdminLoginClient'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  if (await getAdminSession().catch(() => null)) redirect('/admin')
  return <AdminLoginClient />
}
