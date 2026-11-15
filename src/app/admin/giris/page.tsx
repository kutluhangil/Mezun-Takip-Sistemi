import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import { AdminLoginClient } from '@/components/admin/AdminLoginClient'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  try {
    const admin = await getAdminSession()
    if (admin) {
      redirect('/admin')
    }
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err
    }
  }

  const showDemoLogin = process.env.NODE_ENV !== 'production'
  return <AdminLoginClient showDemoLogin={showDemoLogin} />
}
