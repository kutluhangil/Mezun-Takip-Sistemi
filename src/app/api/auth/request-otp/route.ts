import { NextResponse } from 'next/server'
import { generateOtpCode, hashOtp } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { sendOtpEmail } from '@/lib/mail'
import { LIMITS, otpRequestBlock } from '@/lib/rate-limit'
import { getAppSettings } from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

const MSG = {
  name: { tr: 'Lütfen ad-soyad bilginizi giriniz.', en: 'Please enter your full name.' },
  email: { tr: 'Lütfen geçerli bir kişisel e-posta adresi giriniz.', en: 'Please enter a valid personal email address.' },
  student: { tr: 'Öğrenci numarası zorunludur.', en: 'Student number is required.' },
  year: { tr: 'Lütfen geçerli bir mezuniyet yılı seçiniz.', en: 'Please select a valid graduation year.' },
  term: { tr: 'Lütfen mezuniyet dönemini seçiniz.', en: 'Please select a graduation term.' },
  kvkk: { tr: 'Devam etmek için KVKK aydınlatma onayını işaretleyiniz.', en: 'Please confirm the KVKK consent checkbox.' },
  whitelist: {
    tr: 'E-posta adresiniz mezun listesinde bulunamadı. E-posta adresiniz değiştiyse bölüm hocanızla iletişime geçiniz.',
    en: 'Your email was not found in the graduate list. If your email changed, please contact your faculty advisor.',
  },
  cooldown: {
    tr: `Az önce bir kod gönderildi. Yeni kod istemek için lütfen ${LIMITS.otp.cooldownSeconds} saniye bekleyin.`,
    en: `A code was just sent. Please wait ${LIMITS.otp.cooldownSeconds} seconds before requesting another.`,
  },
  email_hourly: {
    tr: 'Bu e-posta için çok fazla kod istendi. Lütfen bir saat sonra tekrar deneyin.',
    en: 'Too many code requests for this email. Please try again in an hour.',
  },
  ip_hourly: {
    tr: 'Bu ağdan çok fazla kod istendi. Lütfen bir süre sonra tekrar deneyin.',
    en: 'Too many code requests from this network. Please try again later.',
  },
  mail: {
    tr: 'E-posta doğrulama servisi şu an gönderim yapamıyor. Lütfen biraz sonra tekrar deneyin.',
    en: 'Email delivery is temporarily unavailable. Please try again shortly.',
  },
} as const

export async function POST(req: Request) {
  try {
    const body = await readJson<{
      fullName?: unknown
      email?: unknown
      studentNumber?: unknown
      graduationYear?: unknown
      graduationTerm?: unknown
      kvkkAccepted?: unknown
      lang?: unknown
    }>(req, 4 * 1024)

    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const fail = (status: number, key: keyof typeof MSG, code?: string) =>
      jsonError(status, MSG[key][lang], code ? { code } : undefined)

    const fullName = String(body.fullName ?? '').trim().slice(0, 120)
    const email = String(body.email ?? '').trim().toLowerCase()
    const studentNumber = String(body.studentNumber ?? '').trim().slice(0, 32)
    const gradYear = Number(body.graduationYear)
    const gradTerm = String(body.graduationTerm ?? '').trim()

    if (fullName.length < 2) return fail(400, 'name')
    if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, 'email')
    if (studentNumber.length < 4) return fail(400, 'student')
    if (!Number.isInteger(gradYear) || gradYear < 2018 || gradYear > new Date().getFullYear() + 1) return fail(400, 'year')
    if (!['guz', 'bahar', 'yaz'].includes(gradTerm)) return fail(400, 'term')
    if (body.kvkkAccepted !== true) return fail(400, 'kvkk')

    const settings = await getAppSettings()
    if (settings.whitelistRequired.enabled) {
      const wl = await query(`SELECT 1 FROM graduates WHERE LOWER(email) = $1 AND anonymized_at IS NULL LIMIT 1`, [email])
      if (wl.rowCount === 0) return fail(403, 'whitelist', 'whitelist_missing')
    }

    const ip = clientIp(req)
    const block = await otpRequestBlock(email, ip)
    if (block) return fail(429, block)

    const code = generateOtpCode()
    const pendingProfile = {
      fullName,
      studentNumber,
      graduationYear: gradYear,
      graduationTerm: gradTerm,
      kvkkVersion: settings.kvkkNotice.version,
    }

    await query(
      `INSERT INTO otp_codes (email, code_hash, pending_profile, expires_at, ip)
       VALUES ($1, $2, $3::jsonb, NOW() + make_interval(mins => $4), $5)`,
      [email, hashOtp(email, code), JSON.stringify(pendingProfile), LIMITS.otp.ttlMinutes, ip]
    )

    const mailRes = await sendOtpEmail({ to: email, fullName, code, lang })
    if (!mailRes.delivered) {
      if (mailRes.provider === 'dev-log' && process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ ok: true, provider: 'dev-log', devCode: code })
      }
      console.error('[auth/request-otp] mail', mailRes.provider, mailRes.error)
      return fail(503, 'mail')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError('auth/request-otp', err, 'Doğrulama kodu hazırlanırken hata oluştu.')
  }
}
