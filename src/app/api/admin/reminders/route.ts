import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { sendReminderEmail } from '@/lib/mail'
import { getActiveSurvey } from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Bir istekte en fazla bu kadar mail: Vercel süre sınırına ve Gmail toplu gönderim frenine takılmamak için */
const BATCH = 20
/** Son bu kadar saatte hatırlatılan mezuna yeniden gönderilmez (çift tıklama / tekrar koruması) */
const COOLDOWN_HOURS = 24
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Hatırlatma partisi gönderir. İstemci `remaining` 0 olana kadar tekrar çağırır.
 * `graduateId` verilirse yalnız o mezuna gönderilir.
 */
export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  if (admin.role !== 'owner') return jsonError(403, 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.')

  try {
    const body = await readJson<{ graduateId?: unknown; lang?: unknown }>(req, 1024)
    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const single = body.graduateId ? String(body.graduateId) : null
    if (single && !UUID_RE.test(single)) return jsonError(400, 'Geçersiz mezun.')
    const survey = await getActiveSurvey()

    const pendingSql = `
      FROM graduates g
      WHERE g.anonymized_at IS NULL
        AND ($3::uuid IS NULL OR g.id = $3::uuid)
        AND NOT EXISTS (
          SELECT 1 FROM responses r
          WHERE r.graduate_id = g.id AND r.survey_id = $1 AND r.status = 'submitted' AND r.period_key = $2
        )
        AND NOT EXISTS (
          SELECT 1 FROM reminder_logs l
          WHERE l.graduate_id = g.id AND l.survey_id = $1 AND l.status = 'sent'
            AND l.sent_at > NOW() - make_interval(hours => $4)
        )`
    const params = [survey.id, survey.active_period, single, COOLDOWN_HOURS]
    const batch = await query<{ id: string; email: string; full_name: string }>(
      `SELECT g.id, g.email, g.full_name ${pendingSql} ORDER BY g.full_name LIMIT ${BATCH}`,
      params
    )

    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3474').replace(/\/$/, '')
    const results: { id: string; status: 'sent' | 'failed'; error: string | null }[] = []
    let devLogged = 0
    for (const g of batch.rows) {
      const res = await sendReminderEmail({ to: g.email, fullName: g.full_name, surveyUrl: `${baseUrl}/giris`, lang })
      if (res.provider === 'dev-log') devLogged++
      results.push({ id: g.id, status: res.delivered || res.provider === 'dev-log' ? 'sent' : 'failed', error: res.error ?? null })
    }

    if (results.length > 0) {
      await query(
        `INSERT INTO reminder_logs (survey_id, graduate_id, sent_by, period_key, status, error_message)
         SELECT $1, (r->>'id')::uuid, $2, $3, r->>'status', r->>'error'
         FROM jsonb_array_elements($4::jsonb) AS r`,
        [survey.id, admin.id, survey.active_period, JSON.stringify(results)]
      )
    }

    const left = await query<{ c: number }>(`SELECT COUNT(*)::int AS c ${pendingSql}`, params)
    const sent = results.filter((r) => r.status === 'sent').length - devLogged
    const failed = results.filter((r) => r.status === 'failed').length
    // Başarısız olanlar cooldown'a girmez; sonsuz döngüyü önlemek için istemci yalnız ilerleme varsa devam eder
    const remaining = failed === results.length ? 0 : left.rows[0].c

    if (results.length > 0) {
      await audit(admin.id, 'reminder.send', {
        ip: clientIp(req),
        detail: { sent, failed, devLogged, single: Boolean(single) },
      })
    }
    return NextResponse.json({ ok: true, processed: results.length, sent, failed, devLogged, remaining })
  } catch (err) {
    return handleRouteError('admin/reminders', err, 'Hatırlatma gönderilemedi.')
  }
}
