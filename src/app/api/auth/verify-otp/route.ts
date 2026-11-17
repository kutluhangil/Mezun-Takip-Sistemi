import { NextResponse } from 'next/server'
import { hashOtp, safeEqual, setGraduateCookie } from '@/lib/auth'
import { query, withTransaction } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, maskIp, readJson } from '@/lib/http'
import { LIMITS } from '@/lib/rate-limit'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

interface PendingProfile {
  fullName?: string
  studentNumber?: string
  graduationYear?: number
  graduationTerm?: 'guz' | 'bahar' | 'yaz'
  kvkkVersion?: string
}

const MSG = {
  format: { tr: 'Lütfen 6 haneli doğrulama kodunu giriniz.', en: 'Please enter the 6-digit verification code.' },
  expired: {
    tr: 'Doğrulama kodu geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.',
    en: 'Verification code is invalid or expired. Please request a new code.',
  },
  locked: {
    tr: 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
    en: 'Too many incorrect attempts. Please request a new verification code.',
  },
  wrong: { tr: 'Doğrulama kodu hatalı.', en: 'Incorrect verification code.' },
} as const

export async function POST(req: Request) {
  try {
    const body = await readJson<{ email?: unknown; code?: unknown; lang?: unknown }>(req, 2 * 1024)
    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const fail = (status: number, key: keyof typeof MSG) => jsonError(status, MSG[key][lang])

    const email = String(body.email ?? '').trim().toLowerCase()
    const code = String(body.code ?? '').replace(/\s+/g, '')
    if (!email || !/^\d{6}$/.test(code)) return fail(400, 'format')

    // Denemeyi önce atomik olarak say: paralel istekler sınırı aşamaz
    const attempt = await query<{ id: string; code_hash: string; pending_profile: PendingProfile }>(
      `UPDATE otp_codes SET attempts = attempts + 1
       WHERE id = (
         SELECT id FROM otp_codes
         WHERE email = $1 AND consumed_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1
       ) AND attempts < $2
       RETURNING id, code_hash, pending_profile`,
      [email, LIMITS.otp.maxVerifyAttempts]
    )
    const otp = attempt.rows[0]
    if (!otp) {
      const live = await query(
        `SELECT 1 FROM otp_codes WHERE email = $1 AND consumed_at IS NULL AND expires_at > NOW() LIMIT 1`,
        [email]
      )
      return live.rowCount ? fail(429, 'locked') : fail(400, 'expired')
    }

    if (!safeEqual(hashOtp(email, code), otp.code_hash)) return fail(400, 'wrong')

    const ipHint = maskIp(clientIp(req))
    const graduate = await withTransaction(async (client) => {
      const consumed = await client.query(
        `UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
        [otp.id]
      )
      if (consumed.rowCount === 0) return null

      const prof = otp.pending_profile ?? {}
      const res = await client.query<{ id: string; session_version: number }>(
        `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), graduates.full_name),
           student_number = COALESCE(NULLIF(EXCLUDED.student_number, ''), graduates.student_number),
           graduation_year = COALESCE(EXCLUDED.graduation_year, graduates.graduation_year),
           graduation_term = COALESCE(EXCLUDED.graduation_term, graduates.graduation_term),
           updated_at = NOW()
         RETURNING id, session_version`,
        [email, prof.fullName || email, prof.studentNumber || '', prof.graduationYear ?? null, prof.graduationTerm ?? null]
      )
      const row = res.rows[0]
      await client.query(`INSERT INTO consents (graduate_id, text_version, ip_hint) VALUES ($1, $2, $3)`, [
        row.id,
        prof.kvkkVersion || 'v0-placeholder',
        ipHint,
      ])
      return row
    })

    if (!graduate) return fail(400, 'expired')
    await setGraduateCookie(graduate.id, graduate.session_version)
    return NextResponse.json({ ok: true, redirectTo: '/anket' })
  } catch (err) {
    return handleRouteError('auth/verify-otp', err, 'Doğrulama tamamlanamadı.')
  }
}
