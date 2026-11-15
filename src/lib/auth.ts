import crypto from 'crypto'
import { cookies } from 'next/headers'
import type { AdminUser, GraduateRecord } from './survey-types'
import { query } from './db'

const GRADUATE_COOKIE = 'mts_graduate_session'
const ADMIN_COOKIE = 'mts_admin_session'
const LANG_COOKIE = 'mts_lang'

let cachedFallbackSecret: string | null = null

function getSessionSecret(): string {
  const env = process.env.SESSION_SECRET?.trim()
  if (env && env.length >= 16) return env
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET ortam değişkeni üretim ortamında zorunludur (en az 16 karakter).')
  }
  if (!cachedFallbackSecret) {
    cachedFallbackSecret = 'dev-only-mezun-takip-ephemeral-' + process.pid
  }
  return cachedFallbackSecret
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hex] = parts
  const derived = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected)
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000))
}

export function hashOtp(email: string, code: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest('hex')
}

interface SignedPayload {
  kind: 'graduate' | 'admin'
  sub: string
  role?: 'owner' | 'viewer'
  exp: number
}

export function signToken(payload: SignedPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token: string | undefined, expectedKind: 'graduate' | 'admin'): SignedPayload | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedPayload
    if (parsed.kind !== expectedKind) return null
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null
    return parsed
  } catch {
    return null
  }
}

function cookieOpts(maxAgeSec: number) {
  const secure = process.env.APP_BASE_URL?.startsWith('https://') ?? false
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSec,
  }
}

export async function setGraduateCookie(graduateId: string): Promise<void> {
  const maxAge = 60 * 60 * 24 * 7 // 7 gün
  const token = signToken({ kind: 'graduate', sub: graduateId, exp: Date.now() + maxAge * 1000 })
  const jar = await cookies()
  jar.set(GRADUATE_COOKIE, token, cookieOpts(maxAge))
}

export async function clearGraduateCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(GRADUATE_COOKIE)
}

export async function setAdminCookie(adminId: string, role: 'owner' | 'viewer'): Promise<void> {
  const maxAge = 60 * 60 * 12 // 12 saat
  const token = signToken({ kind: 'admin', sub: adminId, role, exp: Date.now() + maxAge * 1000 })
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, token, cookieOpts(maxAge))
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(ADMIN_COOKIE)
}

export async function getGraduateSession(): Promise<GraduateRecord | null> {
  const jar = await cookies()
  const parsed = verifyToken(jar.get(GRADUATE_COOKIE)?.value, 'graduate')
  if (!parsed) return null
  const res = await query<GraduateRecord>(
    `SELECT id, email, full_name, student_number, graduation_year, graduation_term,
            created_at::text, updated_at::text
     FROM graduates WHERE id = $1 LIMIT 1`,
    [parsed.sub]
  )
  return res.rows[0] ?? null
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const jar = await cookies()
  const parsed = verifyToken(jar.get(ADMIN_COOKIE)?.value, 'admin')
  if (!parsed) return null
  const res = await query<AdminUser>(
    `SELECT id, email, full_name, role, active
     FROM admins WHERE id = $1 AND active = TRUE LIMIT 1`,
    [parsed.sub]
  )
  return res.rows[0] ?? null
}

export async function getServerLang(): Promise<'tr' | 'en'> {
  const jar = await cookies()
  const v = jar.get(LANG_COOKIE)?.value
  return v === 'en' ? 'en' : 'tr'
}

export { LANG_COOKIE }
