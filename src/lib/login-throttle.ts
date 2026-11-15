import { query } from './db'

const WINDOW_MINUTES = 15
const MAX_FAILS_PER_EMAIL = 5
const MAX_FAILS_PER_IP = 20

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

export async function isLoginBlocked(email: string, ip: string): Promise<boolean> {
  const res = await query<{ by_email: string; by_ip: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE LOWER(email) = $1)::text AS by_email,
       COUNT(*) FILTER (WHERE ip = $2)::text AS by_ip
     FROM login_attempts
     WHERE created_at > NOW() - make_interval(mins => $3)`,
    [email, ip, WINDOW_MINUTES]
  )
  const row = res.rows[0]
  return Number(row?.by_email ?? 0) >= MAX_FAILS_PER_EMAIL || Number(row?.by_ip ?? 0) >= MAX_FAILS_PER_IP
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  await query(`INSERT INTO login_attempts (email, ip) VALUES ($1, $2)`, [email, ip])
}

export async function clearLoginFailures(email: string): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE LOWER(email) = $1`, [email])
}
