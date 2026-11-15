import { NextResponse } from 'next/server'
import { generateOtpCode, hashOtp } from '@/lib/auth'
import { query } from '@/lib/db'
import { sendOtpEmail } from '@/lib/mail'
import { getAppSettings } from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      fullName?: string
      email?: string
      studentNumber?: string
      graduationYear?: number | string
      graduationTerm?: string
      kvkkAccepted?: boolean
      lang?: string
    }

    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const isEn = lang === 'en'

    const fullName = String(body.fullName ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const studentNumber = String(body.studentNumber ?? '').trim()
    const gradYear = Number(body.graduationYear)
    const gradTerm = String(body.graduationTerm ?? '').trim()
    const kvkkAccepted = Boolean(body.kvkkAccepted)

    if (fullName.length < 2) {
      return NextResponse.json(
        { error: isEn ? 'Please enter your full name.' : 'Lütfen ad-soyad bilginizi giriniz.' },
        { status: 400 }
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: isEn ? 'Please enter a valid personal email address.' : 'Lütfen geçerli bir kişisel e-posta adresi giriniz.' },
        { status: 400 }
      )
    }
    if (studentNumber.length < 4) {
      return NextResponse.json(
        { error: isEn ? 'Student number is required.' : 'Öğrenci numarası zorunludur.' },
        { status: 400 }
      )
    }
    const maxYear = new Date().getFullYear() + 1
    if (!Number.isInteger(gradYear) || gradYear < 2018 || gradYear > maxYear) {
      return NextResponse.json(
        { error: isEn ? 'Please select a valid graduation year.' : 'Lütfen geçerli bir mezuniyet yılı seçiniz.' },
        { status: 400 }
      )
    }
    if (!['guz', 'bahar', 'yaz'].includes(gradTerm)) {
      return NextResponse.json(
        { error: isEn ? 'Please select a graduation term.' : 'Lütfen mezuniyet dönemini seçiniz.' },
        { status: 400 }
      )
    }
    if (!kvkkAccepted) {
      return NextResponse.json(
        { error: isEn ? 'Please confirm the KVKK consent checkbox.' : 'Devam etmek için KVKK aydınlatma onayını işaretleyiniz.' },
        { status: 400 }
      )
    }

    const settings = await getAppSettings()
    if (settings.whitelistRequired.enabled) {
      const wl = await query<{ id: string }>(
        `SELECT id FROM graduates WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      )
      if (!wl.rows[0]) {
        return NextResponse.json(
          {
            code: 'whitelist_missing',
            error: isEn
              ? 'Your email was not found in the graduate list. If your email changed, please contact your faculty advisor.'
              : 'E-posta adresiniz mezun listesinde bulunamadı. E-posta adresiniz değiştiyse bölüm hocanızla iletişime geçiniz.',
          },
          { status: 403 }
        )
      }
    }

    // 30 saniyelik spam koruması
    const recent = await query<{ created_at: string }>(
      `SELECT created_at::text
       FROM otp_codes
       WHERE LOWER(email) = $1 AND consumed_at IS NULL AND created_at > NOW() - INTERVAL '30 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    )
    if (recent.rows[0]) {
      return NextResponse.json(
        {
          error: isEn
            ? 'A code was just sent. Please wait 30 seconds before requesting another.'
            : 'Az önce bir kod gönderildi. Yeni kod istemek için lütfen 30 saniye bekleyin.',
        },
        { status: 429 }
      )
    }

    const hourly = await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM otp_codes
       WHERE LOWER(email) = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email]
    )
    if (Number(hourly.rows[0]?.c ?? 0) >= 8) {
      return NextResponse.json(
        {
          error: isEn
            ? 'Too many code requests for this email. Please try again in an hour.'
            : 'Bu e-posta için çok fazla kod istendi. Lütfen bir saat sonra tekrar deneyin.',
        },
        { status: 429 }
      )
    }

    const code = generateOtpCode()
    const codeHash = hashOtp(email, code)
    const pendingProfile = {
      fullName,
      studentNumber,
      graduationYear: gradYear,
      graduationTerm: gradTerm,
      kvkkAccepted: true,
      kvkkVersion: settings.kvkkNotice.version,
    }

    await query(
      `INSERT INTO otp_codes (email, code_hash, pending_profile, expires_at)
       VALUES ($1, $2, $3::jsonb, NOW() + INTERVAL '10 minutes')`,
      [email, codeHash, JSON.stringify(pendingProfile)]
    )

    const mailRes = await sendOtpEmail({ to: email, fullName, code, lang })

    if (!mailRes.delivered) {
      if (mailRes.provider === 'dev-log' && process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          ok: true,
          provider: 'dev-log',
          devCode: code,
        })
      }
      return NextResponse.json(
        {
          error: isEn
            ? 'Email delivery service is not configured or temporarily unavailable.'
            : 'E-posta doğrulama servisi şu an gönderim yapamıyor. Yönetici SMTP/Resend ayarlarını kontrol etmelidir.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true, provider: mailRes.provider })
  } catch (err) {
    console.error('[auth/request-otp]', err)
    return NextResponse.json({ error: 'Doğrulama kodu hazırlanırken hata oluştu.' }, { status: 500 })
  }
}
