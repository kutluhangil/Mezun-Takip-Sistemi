import { NextResponse } from 'next/server'
import { setAdminCookie } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GEÇİCİ GELİŞTİRME / ÖNİZLEME ENDPOINT'İ — Canlıda (production) devre dışı
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const res = await query<{ id: string; role: 'owner' | 'viewer' }>(
      `SELECT id, role FROM admins
       ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, created_at ASC
       LIMIT 1`
    )

    const admin = res.rows[0]
    if (!admin) {
      return NextResponse.json({ error: 'Demo yönetici hesabı bulunamadı.' }, { status: 404 })
    }

    await setAdminCookie(admin.id, admin.role)
    return NextResponse.json({ ok: true, redirectTo: '/admin' })
  } catch (err) {
    console.error('[admin/demo-login]', err)
    return NextResponse.json({ error: 'Demo yönetici oturumu açılamadı.' }, { status: 500 })
  }
}
