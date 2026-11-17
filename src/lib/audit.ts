import { query } from './db'

export type AuditAction =
  | 'admin.login'
  | 'admin.logout'
  | 'admin.password_change'
  | 'admin.create'
  | 'admin.reset_password'
  | 'admin.toggle'
  | 'settings.survey'
  | 'settings.whitelist'
  | 'settings.kvkk'
  | 'graduate.upsert'
  | 'graduate.import'
  | 'graduate.anonymize'
  | 'export.download'
  | 'reminder.send'

export interface AuditEntry {
  id: string
  admin_email: string | null
  action: AuditAction
  target: string | null
  detail: Record<string, unknown>
  created_at: string
}

/** Denetim kaydı ana işlemi asla düşürmez; yazılamazsa sadece loglanır. */
export async function audit(
  adminId: string | null,
  action: AuditAction,
  opts: { target?: string; detail?: Record<string, unknown>; ip?: string } = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, action, target, detail, ip) VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [adminId, action, opts.target ?? null, JSON.stringify(opts.detail ?? {}), opts.ip ?? null]
    )
  } catch (err) {
    console.error('[audit]', action, err)
  }
}

export async function recentAudit(limit = 50): Promise<AuditEntry[]> {
  const res = await query<AuditEntry>(
    `SELECT l.id::text, a.email AS admin_email, l.action, l.target, l.detail, l.created_at::text
     FROM audit_logs l LEFT JOIN admins a ON a.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT $1`,
    [limit]
  )
  return res.rows
}
