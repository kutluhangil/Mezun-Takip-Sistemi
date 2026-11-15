import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { sendReminderEmail } from '@/lib/mail'
import { getActiveSurvey, getGraduatesWithStatus } from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için Program Başkanı (Owner) yetkisi gerekir.' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as { graduateId?: string; lang?: string }
    const lang: Lang = body.lang === 'en' ? 'en' : 'tr'
    const survey = await getActiveSurvey()
    const allGraduates = await getGraduatesWithStatus(survey.id, survey.active_period)

    const targets = body.graduateId
      ? allGraduates.filter((g) => g.id === body.graduateId)
      : allGraduates.filter((g) => !g.filled_active_period)

    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3474').replace(/\/$/, '')
    const surveyUrl = `${baseUrl}/giris`

    let sent = 0
    let failed = 0
    let devLogged = 0

    for (const g of targets) {
      const res = await sendReminderEmail({
        to: g.email,
        fullName: g.full_name,
        surveyUrl,
        lang,
      })

      const status = res.delivered || res.provider === 'dev-log' ? 'sent' : 'failed'
      await query(
        `INSERT INTO reminder_logs (survey_id, graduate_id, sent_by, period_key, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [survey.id, g.id, admin.id, survey.active_period, status, res.error ?? null]
      )

      if (res.delivered) sent++
      else if (res.provider === 'dev-log') devLogged++
      else failed++
    }

    return NextResponse.json({ ok: true, total: targets.length, sent, devLogged, failed })
  } catch (err) {
    console.error('[admin/reminders]', err)
    return NextResponse.json({ error: 'Hatırlatma gönderilemedi.' }, { status: 500 })
  }
}
