import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { clearAdminCookie, getAdminSession, revokeSessions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Çıkış tüm cihazlardaki yönetici oturumlarını düşürür. */
export async function POST() {
  const admin = await getAdminSession()
  if (admin) {
    await revokeSessions('admin', admin.id)
    await audit(admin.id, 'admin.logout')
  }
  await clearAdminCookie()
  return NextResponse.json({ ok: true })
}
