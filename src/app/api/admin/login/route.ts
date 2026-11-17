import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { setAdminCookie, verifyPassword } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { clearLoginFailures, isLoginBlocked, LIMITS, recordLoginFailure } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: unknown; password?: unknown; remember?: unknown }>(req, 2 * 1024)
    const email = String(body.email ?? '').trim().toLowerCase().slice(0, 254)
    const password = String(body.password ?? '').slice(0, 256)
    const remember = body.remember === true

    if (!email || !password) return jsonError(400, 'E-posta ve şifre zorunludur.')

    const ip = clientIp(req)
    if (await isLoginBlocked(email, ip)) {
      return jsonError(429, `Çok fazla başarısız deneme. Lütfen ${LIMITS.login.windowMinutes} dakika sonra tekrar deneyin.`)
    }

    const res = await query<{
      id: string
      email: string
      full_name: string
      role: 'owner' | 'viewer'
      password_hash: string
      active: boolean
      session_version: number
    }>(
      `SELECT id, email, full_name, role, password_hash, active, session_version
       FROM admins WHERE LOWER(email) = $1 LIMIT 1`,
      [email]
    )
    const admin = res.rows[0]
    // Hesap yoksa da sahte hash ile aynı sürede çalışır (hesap varlığı süreden anlaşılmaz)
    const ok = verifyPassword(password, admin?.password_hash)
    if (!admin || !admin.active || !ok) {
      await recordLoginFailure(email, ip)
      return jsonError(401, 'Geçersiz e-posta veya şifre.')
    }

    await clearLoginFailures(email, ip)
    await setAdminCookie(admin.id, admin.session_version, remember)
    await audit(admin.id, 'admin.login', { ip, detail: { remember } })
    return NextResponse.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, full_name: admin.full_name, role: admin.role },
    })
  } catch (err) {
    return handleRouteError('admin/login', err, 'Giriş sırasında hata oluştu.')
  }
}
