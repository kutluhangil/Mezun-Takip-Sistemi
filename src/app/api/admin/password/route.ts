import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { getAdminSession, hashPassword, MIN_ADMIN_PASSWORD, setAdminCookie, verifyPassword } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { isLoginBlocked, recordLoginFailure } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Her yönetici kendi şifresini değiştirir; diğer tüm cihazlardaki oturumlar düşer, bu cihazınki yenilenir. */
export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  const ip = clientIp(req)

  try {
    const body = await readJson<{ current?: unknown; next?: unknown }>(req, 2 * 1024)
    const current = String(body.current ?? '')
    const next = String(body.next ?? '')
    if (next.length < MIN_ADMIN_PASSWORD) return jsonError(400, `Yeni şifre en az ${MIN_ADMIN_PASSWORD} karakter olmalı.`)
    if (next === current) return jsonError(400, 'Yeni şifre eskisiyle aynı olamaz.')
    if (await isLoginBlocked(admin.email, ip)) return jsonError(429, 'Çok fazla hatalı deneme. Lütfen biraz sonra tekrar deneyin.')

    const row = await query<{ password_hash: string }>(`SELECT password_hash FROM admins WHERE id = $1`, [admin.id])
    if (!verifyPassword(current, row.rows[0]?.password_hash)) {
      await recordLoginFailure(admin.email, ip)
      return jsonError(400, 'Mevcut şifre hatalı.')
    }

    const upd = await query<{ session_version: number }>(
      `UPDATE admins SET password_hash = $2, session_version = session_version + 1, password_changed_at = NOW()
       WHERE id = $1 RETURNING session_version`,
      [admin.id, hashPassword(next)]
    )
    await setAdminCookie(admin.id, upd.rows[0].session_version)
    await audit(admin.id, 'admin.password_change', { ip })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError('admin/password', err, 'Şifre değiştirilemedi.')
  }
}
