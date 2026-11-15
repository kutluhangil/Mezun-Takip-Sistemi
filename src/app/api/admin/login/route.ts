import { NextResponse } from 'next/server'
import { setAdminCookie, verifyPassword } from '@/lib/auth'
import { query } from '@/lib/db'
import { clearLoginFailures, clientIp, isLoginBlocked, recordLoginFailure } from '@/lib/login-throttle'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string }
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 })
    }

    const ip = clientIp(req)
    if (await isLoginBlocked(email, ip)) {
      return NextResponse.json(
        { error: 'Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      )
    }

    const res = await query<{
      id: string
      email: string
      full_name: string
      role: 'owner' | 'viewer'
      password_hash: string
      active: boolean
    }>(
      `SELECT id, email, full_name, role, password_hash, active
       FROM admins WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    )

    const admin = res.rows[0]
    if (!admin || !admin.active || !verifyPassword(password, admin.password_hash)) {
      await recordLoginFailure(email, ip)
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre.' }, { status: 401 })
    }

    await clearLoginFailures(email)
    await setAdminCookie(admin.id, admin.role)
    return NextResponse.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role },
    })
  } catch (err) {
    console.error('[admin/login]', err)
    return NextResponse.json({ error: 'Giriş sırasında hata oluştu.' }, { status: 500 })
  }
}
