import { NextResponse } from 'next/server'
import { setGraduateCookie } from '@/lib/auth'
import { query } from '@/lib/db'
import { getActiveSurvey } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

// GEÇİCİ GELİŞTİRME / ÖNİZLEME ENDPOINT'İ — Canlıda (production) devre dışı
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const survey = await getActiveSurvey()
    const baseEmail = 'demo.preview@example.com'

    const existing = await query<{ id: string }>(
      `SELECT id FROM graduates WHERE LOWER(email) = $1 LIMIT 1`,
      [baseEmail]
    )

    let targetEmail = baseEmail
    if (existing.rows[0]) {
      const subCheck = await query<{ id: string }>(
        `SELECT id FROM responses
         WHERE graduate_id = $1 AND survey_id = $2 AND period_key = $3 AND status = 'submitted'
         LIMIT 1`,
        [existing.rows[0].id, survey.id, survey.active_period]
      )
      if (subCheck.rows[0]) {
        targetEmail = `demo.preview+${Date.now()}@example.com`
      }
    }

    const gradRes = await query<{ id: string }>(
      `INSERT INTO graduates (email, full_name, student_number, graduation_year, graduation_term)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [targetEmail, 'Demo Mezun (Önizleme)', '230401999', 2024, 'bahar']
    )

    const graduateId = gradRes.rows[0].id
    await setGraduateCookie(graduateId)
    return NextResponse.json({ ok: true, redirectTo: '/anket' })
  } catch (err) {
    console.error('[auth/demo-login]', err)
    return NextResponse.json({ error: 'Demo oturumu açılamadı.' }, { status: 500 })
  }
}
