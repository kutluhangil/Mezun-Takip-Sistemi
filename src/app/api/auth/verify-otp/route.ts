import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { hashOtp, setGraduateCookie } from '@/lib/auth'
import { query, rawPool } from '@/lib/db'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string
      code?: string
      lang?: string
    }

    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const isEn = lang === 'en'
    const email = String(body.email ?? '').trim().toLowerCase()
    const code = String(body.code ?? '').replace(/\s+/g, '')

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: isEn ? 'Please enter the 6-digit verification code.' : 'Lütfen 6 haneli doğrulama kodunu giriniz.' },
        { status: 400 }
      )
    }

    const otpRes = await query<{
      id: string
      code_hash: string
      attempts: number
      pending_profile: {
        fullName?: string
        studentNumber?: string
        graduationYear?: number
        graduationTerm?: 'guz' | 'bahar' | 'yaz'
        kvkkVersion?: string
      }
    }>(
      `SELECT id, code_hash, attempts, pending_profile
       FROM otp_codes
       WHERE LOWER(email) = $1
         AND consumed_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    )

    const otp = otpRes.rows[0]
    if (!otp) {
      return NextResponse.json(
        {
          error: isEn
            ? 'Verification code is invalid or expired. Please request a new code.'
            : 'Doğrulama kodu geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.',
        },
        { status: 400 }
      )
    }

    if (otp.attempts >= 5) {
      return NextResponse.json(
        {
          error: isEn
            ? 'Too many incorrect attempts. Please request a new verification code.'
            : 'Çok fazla hatalı deneme yapıldı. Lütfen yeni bir doğrulama kodu isteyin.',
        },
        { status: 429 }
      )
    }

    const candidateHash = hashOtp(email, code)
    const a = Buffer.from(candidateHash, 'utf8')
    const b = Buffer.from(otp.code_hash, 'utf8')
    const matches = a.length === b.length && crypto.timingSafeEqual(a, b)

    if (!matches) {
      await query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [otp.id])
      return NextResponse.json(
        { error: isEn ? 'Incorrect verification code.' : 'Doğrulama kodu hatalı.' },
        { status: 400 }
      )
    }

    const pool = await rawPool()
    const client = await pool.connect()
    let graduateId: string

    try {
      await client.query('BEGIN')
      await client.query(`UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1`, [otp.id])

      const prof = otp.pending_profile ?? {}
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM graduates WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      )

      if (existing.rows[0]) {
        graduateId = existing.rows[0].id
        await client.query(
          `UPDATE graduates
           SET full_name = COALESCE(NULLIF($2, ''), full_name),
               student_number = COALESCE(NULLIF($3, ''), student_number),
               graduation_year = COALESCE($4, graduation_year),
               graduation_term = COALESCE($5, graduation_term),
               updated_at = NOW()
           WHERE id = $1`,
          [
            graduateId,
            prof.fullName ?? '',
            prof.studentNumber ?? '',
            prof.graduationYear ?? null,
            prof.graduationTerm ?? null,
          ]
        )
      } else {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            email,
            prof.fullName || email,
            prof.studentNumber || '',
            prof.graduationYear ?? null,
            prof.graduationTerm ?? null,
          ]
        )
        graduateId = ins.rows[0].id
      }

      const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
      await client.query(
        `INSERT INTO consents (graduate_id, text_version, ip_hint)
         VALUES ($1, $2, $3)`,
        [graduateId, prof.kvkkVersion || 'v0-placeholder', fwd.slice(0, 64)]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    await setGraduateCookie(graduateId)
    return NextResponse.json({ ok: true, redirectTo: '/anket' })
  } catch (err) {
    console.error('[auth/verify-otp]', err)
    return NextResponse.json({ error: 'Doğrulama tamamlanamadı.' }, { status: 500 })
  }
}
