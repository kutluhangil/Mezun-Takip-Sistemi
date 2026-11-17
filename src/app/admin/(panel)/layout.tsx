import { requireAdmin } from '@/lib/admin-loader'
import { AdminShell } from '@/components/ui/Shells'

export const dynamic = 'force-dynamic'

/** Menü sayfalar arasında kalıcı: gezinmede yalnız içerik yenilenir, oturum sorgusu sayfayla paylaşılır. */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  return <AdminShell admin={admin}>{children}</AdminShell>
}
