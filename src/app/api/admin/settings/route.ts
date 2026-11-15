import { NextResponse } from 'next/server'
import { getAdminSession, hashPassword } from '@/lib/auth'
import { query } from '@/lib/db'
import { getActiveSurvey } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (admin.role !== 'owner') {
    return NextResponse.json({ error: 'Yalnızca Program Başkanı (Owner) ayarları değiştirebilir.' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as {
      is_open?: boolean
      repeat_mode?: 'period' | 'cooldown_days' | 'once'
      active_period?: string
      cooldown_days?: number
      whitelist_required?: boolean
      kvkk_notice?: { version?: string; tr?: string; en?: string }
      newAdmin?: { email: string; full_name: string; role: 'owner' | 'viewer'; password: string }
      toggleAdmin?: { id: string; active: boolean }
    }

    const survey = await getActiveSurvey()

    if (
      body.is_open !== undefined ||
      body.repeat_mode !== undefined ||
      body.active_period !== undefined ||
      body.cooldown_days !== undefined
    ) {
      const nextOpen = body.is_open ?? survey.is_open
      const nextMode = body.repeat_mode ?? survey.repeat_mode
      const nextPeriod = (body.active_period ?? survey.active_period).trim() || survey.active_period
      const nextCooldown = Math.max(1, Number(body.cooldown_days ?? survey.cooldown_days))

      await query(
        `UPDATE surveys
         SET is_open = $2,
             repeat_mode = $3,
             active_period = $4,
             cooldown_days = $5,
             updated_at = NOW()
         WHERE id = $1`,
        [survey.id, nextOpen, nextMode, nextPeriod, nextCooldown]
      )
    }

    if (body.whitelist_required !== undefined) {
      await query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('whitelist_required', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify({ enabled: Boolean(body.whitelist_required) })]
      )
    }

    if (body.kvkk_notice) {
      const payload = {
        version: (body.kvkk_notice.version || 'v1').trim(),
        tr: body.kvkk_notice.tr ?? '',
        en: body.kvkk_notice.en ?? '',
      }
      await query(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('kvkk_notice', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(payload)]
      )
    }

    if (body.newAdmin) {
      const { email, full_name, role, password } = body.newAdmin
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail.includes('@') || full_name.trim().length < 2 || password.length < 6) {
        return NextResponse.json(
          { error: 'Geçerli e-posta, ad-soyad ve en az 6 karakterli şifre giriniz.' },
          { status: 400 }
        )
      }
      await query(
        `INSERT INTO admins (email, full_name, role, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           password_hash = EXCLUDED.password_hash,
           active = TRUE`,
        [cleanEmail, full_name.trim(), role === 'owner' ? 'owner' : 'viewer', hashPassword(password)]
      )
    }

    if (body.toggleAdmin) {
      if (body.toggleAdmin.id === admin.id && !body.toggleAdmin.active) {
        return NextResponse.json({ error: 'Kendi hesabınızı pasife alamazsınız.' }, { status: 400 })
      }
      await query(`UPDATE admins SET active = $2 WHERE id = $1`, [
        body.toggleAdmin.id,
        Boolean(body.toggleAdmin.active),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/settings]', err)
    return NextResponse.json({ error: 'Ayarlar güncellenemedi.' }, { status: 500 })
  }
}
