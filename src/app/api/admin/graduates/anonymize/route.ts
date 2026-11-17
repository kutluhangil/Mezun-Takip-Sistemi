import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { getAdminSession } from '@/lib/auth'
import { withTransaction } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * KVKK silme talebi: mezunun kimlik bilgileri geri döndürülemez biçimde silinir,
 * anket cevapları istatistik için kimliksiz kalır. Yanıt içindeki ad/e-posta cevapları da silinir.
 */
export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  if (admin.role !== 'owner') return jsonError(403, 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.')

  try {
    const body = await readJson<{ id?: unknown; confirm?: unknown }>(req, 1024)
    const id = String(body.id ?? '')
    if (!UUID_RE.test(id) || body.confirm !== 'ANONIMLESTIR') return jsonError(400, 'Onay metni eksik.')

    const done = await withTransaction(async (client) => {
      const cur = await client.query<{ email: string }>(
        `SELECT email FROM graduates WHERE id = $1 AND anonymized_at IS NULL FOR UPDATE`,
        [id]
      )
      if (cur.rowCount === 0) return false
      await client.query(`DELETE FROM otp_codes WHERE email = $1`, [cur.rows[0].email])
      await client.query(`DELETE FROM login_attempts WHERE email = $1`, [cur.rows[0].email])
      const res = await client.query(
        `UPDATE graduates
         SET email = 'anonim-' || id::text || '@anon.invalid',
             full_name = 'Anonim mezun',
             student_number = '',
             extra = '{}'::jsonb,
             anonymized_at = NOW(),
             session_version = session_version + 1,
             updated_at = NOW()
         WHERE id = $1 AND anonymized_at IS NULL
         RETURNING id`,
        [id]
      )
      if (res.rowCount === 0) return false
      await client.query(
        `DELETE FROM answers
         WHERE question_id IN ('q_full_name', 'q_email', 'q_student_number')
           AND response_id IN (SELECT id FROM responses WHERE graduate_id = $1)`,
        [id]
      )
      await client.query(`UPDATE consents SET ip_hint = NULL WHERE graduate_id = $1`, [id])
      return true
    })
    if (!done) return jsonError(404, 'Mezun bulunamadı veya zaten anonim.')

    await audit(admin.id, 'graduate.anonymize', { target: id, ip: clientIp(req) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError('admin/graduates/anonymize', err, 'Anonimleştirme yapılamadı.')
  }
}
