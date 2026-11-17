import crypto from 'crypto'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { hashPassword } from '../../db/core.mjs'
import type { AdminUser, GraduateRecord } from './survey-types'
import { query } from './db'

export { hashPassword }

const GRADUATE_COOKIE = 'mts_graduate_session'
const ADMIN_COOKIE = 'mts_admin_session'
export const LANG_COOKIE = 'mts_lang'
export const THEME_COOKIE = 'mts_theme'

export const MIN_ADMIN_PASSWORD = 12

let devSecret: string | null = null

function getSessionSecret(): string {
  const env = process.env.SESSION_SECRET?.trim()
  if (env && env.length >= 16) return env
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET üretimde zorunludur (en az 32 karakter önerilir).')
  }
  devSecret ??= crypto.randomBytes(32).toString('hex')
  return devSecret
}

// Var olmayan hesapta da aynı sürede yanıt vermek için sabit sahte hash
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'))

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const parts = (stored || DUMMY_HASH).split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hex] = parts
  const derived = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected) && Boolean(stored)
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

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

interface SignedPayload {
  kind: 'graduate' | 'admin'
  sub: string
  /** session_version: çıkış veya şifre değişiminde artar, eski çerezler düşer */
  v: number
  exp: number
}

export function signToken(payload: SignedPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token: string | undefined, expectedKind: SignedPayload['kind']): SignedPayload | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(body).digest('base64url')
  if (!safeEqual(sig, expectedSig)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedPayload
    if (parsed.kind !== expectedKind) return null
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) return null
    if (typeof parsed.v !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production' || (process.env.APP_BASE_URL?.startsWith('https://') ?? false),
    path: '/',
    maxAge: maxAgeSec,
  }
}

export async function setGraduateCookie(graduateId: string, sessionVersion: number): Promise<void> {
  const maxAge = 60 * 60 * 24 * 7
  const token = signToken({ kind: 'graduate', sub: graduateId, v: sessionVersion, exp: Date.now() + maxAge * 1000 })
  ;(await cookies()).set(GRADUATE_COOKIE, token, cookieOpts(maxAge))
}

export async function clearGraduateCookie(): Promise<void> {
  ;(await cookies()).delete(GRADUATE_COOKIE)
}

export async function setAdminCookie(adminId: string, sessionVersion: number, rememberMe = false): Promise<void> {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12
  const token = signToken({ kind: 'admin', sub: adminId, v: sessionVersion, exp: Date.now() + maxAge * 1000 })
  ;(await cookies()).set(ADMIN_COOKIE, token, cookieOpts(maxAge))
}

export async function clearAdminCookie(): Promise<void> {
  ;(await cookies()).delete(ADMIN_COOKIE)
}

async function readToken(name: string, kind: SignedPayload['kind']) {
  return verifyToken((await cookies()).get(name)?.value, kind)
}

export async function getGraduateSession(): Promise<GraduateRecord | null> {
  const parsed = await readToken(GRADUATE_COOKIE, 'graduate')
  if (!parsed) return null
  const res = await query<GraduateRecord>(
    `SELECT id, email, full_name, student_number, graduation_year, graduation_term,
            created_at::text, updated_at::text
     FROM graduates
     WHERE id = $1 AND session_version = $2 AND anonymized_at IS NULL
     LIMIT 1`,
    [parsed.sub, parsed.v]
  )
  return res.rows[0] ?? null
}

/** İstek başına bir kez: panel layout'u ve sayfa aynı sorguyu paylaşır. */
export const getAdminSession = cache(async (): Promise<AdminUser | null> => {
  const parsed = await readToken(ADMIN_COOKIE, 'admin')
  if (!parsed) return null
  const res = await query<AdminUser>(
    `SELECT id, email, full_name, role, active
     FROM admins WHERE id = $1 AND active = TRUE AND session_version = $2 LIMIT 1`,
    [parsed.sub, parsed.v]
  )
  return res.rows[0] ?? null
})

/** Çıkışta tüm cihazlardaki oturumları düşürmek için sürümü artırır. */
export async function revokeSessions(kind: 'admin' | 'graduate', id: string): Promise<void> {
  const table = kind === 'admin' ? 'admins' : 'graduates'
  await query(`UPDATE ${table} SET session_version = session_version + 1 WHERE id = $1`, [id])
}

export async function getServerLang(): Promise<'tr' | 'en'> {
  return (await cookies()).get(LANG_COOKIE)?.value === 'en' ? 'en' : 'tr'
}

export async function getServerTheme(): Promise<'light' | 'dark' | 'system'> {
  // Seçim yapılmadıysa site her zaman açık temada açılır; "Sistem" yalnız elle seçilince
  const v = (await cookies()).get(THEME_COOKIE)?.value
  return v === 'dark' || v === 'system' ? v : 'light'
}
