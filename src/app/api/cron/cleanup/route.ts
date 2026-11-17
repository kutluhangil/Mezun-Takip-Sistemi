import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Günlük temizlik (Vercel Cron, vercel.json). Kişisel veri barındıran geçici tablolar süresiz büyümez.
 * Vercel, CRON_SECRET tanımlıysa isteğe `Authorization: Bearer <CRON_SECRET>` ekler.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const otp = await query(`DELETE FROM otp_codes WHERE created_at < NOW() - INTERVAL '7 days'`)
  const attempts = await query(`DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL '30 days'`)
  const audit = await query(`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years'`)
  return NextResponse.json({ ok: true, otp: otp.rowCount, loginAttempts: attempts.rowCount, audit: audit.rowCount })
}
