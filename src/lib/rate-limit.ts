import { query } from './db'

/** Tüm sınırlar tek yerde; testler ve belgeler buradan okur. */
export const LIMITS = {
  login: {
    windowMinutes: 15,
    /** Aynı e-posta + aynı IP: hesap sahibini dışarıda bırakmadan kaba kuvveti durdurur */
    perEmailIp: 5,
    /** Aynı IP'den tüm hesaplara */
    perIp: 20,
    /** Dağıtık saldırı freni: e-postaya çok sayıda farklı IP'den deneme */
    perEmailGlobal: 50,
  },
  otp: {
    cooldownSeconds: 30,
    perEmailHour: 8,
    perIpHour: 10,
    maxVerifyAttempts: 5,
    ttlMinutes: 10,
  },
} as const

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const L = LIMITS.login
  const res = await query<{ pair: number; by_ip: number; by_email: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email = $1 AND ip = $2)::int AS pair,
       COUNT(*) FILTER (WHERE ip = $2)::int AS by_ip,
       COUNT(*) FILTER (WHERE email = $1)::int AS by_email
     FROM login_attempts
     WHERE created_at > NOW() - make_interval(mins => $3)`,
    [email, ip, L.windowMinutes]
  )
  const r = res.rows[0]
  return (r?.pair ?? 0) >= L.perEmailIp || (r?.by_ip ?? 0) >= L.perIp || (r?.by_email ?? 0) >= L.perEmailGlobal
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  await query(`INSERT INTO login_attempts (email, ip) VALUES ($1, $2)`, [email, ip])
}

export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE email = $1 AND ip = $2`, [email, ip])
}

export type OtpRequestBlock = 'cooldown' | 'email_hourly' | 'ip_hourly' | null

export async function otpRequestBlock(email: string, ip: string): Promise<OtpRequestBlock> {
  const L = LIMITS.otp
  const res = await query<{ recent: number; by_email: number; by_ip: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email = $1 AND created_at > NOW() - make_interval(secs => $3))::int AS recent,
       COUNT(*) FILTER (WHERE email = $1)::int AS by_email,
       COUNT(*) FILTER (WHERE ip = $2)::int AS by_ip
     FROM otp_codes
     WHERE created_at > NOW() - INTERVAL '1 hour'`,
    [email, ip, L.cooldownSeconds]
  )
  const r = res.rows[0]
  if ((r?.recent ?? 0) > 0) return 'cooldown'
  if ((r?.by_email ?? 0) >= L.perEmailHour) return 'email_hourly'
  if ((r?.by_ip ?? 0) >= L.perIpHour) return 'ip_hourly'
  return null
}
