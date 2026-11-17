import { NextResponse } from 'next/server'
import { audit } from '@/lib/audit'
import { getAdminSession, hashPassword, MIN_ADMIN_PASSWORD } from '@/lib/auth'
import { isUniqueViolation, query } from '@/lib/db'
import { clientIp, handleRouteError, jsonError, readJson } from '@/lib/http'
import { getActiveSurvey } from '@/lib/server-data'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PERIOD_RE = /^[\p{L}\p{N} _.-]{2,32}$/u
const REPEAT_MODES = ['period', 'cooldown_days', 'once'] as const

interface SettingsBody {
  is_open?: unknown
  repeat_mode?: unknown
  active_period?: unknown
  cooldown_days?: unknown
  whitelist_required?: unknown
  kvkk_notice?: { version?: unknown; tr?: unknown; en?: unknown }
  newAdmin?: { email?: unknown; full_name?: unknown; role?: unknown; password?: unknown }
  resetPassword?: { id?: unknown; password?: unknown }
  toggleAdmin?: { id?: unknown; active?: unknown }
}

const pwError = `Şifre en az ${MIN_ADMIN_PASSWORD} karakter olmalı.`

export async function PATCH(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')
  if (admin.role !== 'owner') return jsonError(403, 'Yalnızca Program Başkanı (Owner) ayarları değiştirebilir.')
  const ip = clientIp(req)

  try {
    const body = await readJson<SettingsBody>(req, 128 * 1024)
    const survey = await getActiveSurvey()

    if (
      body.is_open !== undefined ||
      body.repeat_mode !== undefined ||
      body.active_period !== undefined ||
      body.cooldown_days !== undefined
    ) {
      const nextOpen = typeof body.is_open === 'boolean' ? body.is_open : survey.is_open
      const nextMode = REPEAT_MODES.find((m) => m === body.repeat_mode) ?? survey.repeat_mode
      const periodRaw = typeof body.active_period === 'string' ? body.active_period.trim() : survey.active_period
      if (!PERIOD_RE.test(periodRaw)) return jsonError(400, 'Dönem etiketi 2–32 karakter olmalı (harf, rakam, - _ .).')
      const cooldown = Math.round(Number(body.cooldown_days ?? survey.cooldown_days))
      if (!Number.isFinite(cooldown) || cooldown < 1 || cooldown > 3650) return jsonError(400, 'Bekleme süresi 1–3650 gün olmalı.')

      await query(
        `UPDATE surveys SET is_open = $2, repeat_mode = $3, active_period = $4, cooldown_days = $5, updated_at = NOW()
         WHERE id = $1`,
        [survey.id, nextOpen, nextMode, periodRaw, cooldown]
      )
      await audit(admin.id, 'settings.survey', {
        ip,
        detail: { is_open: nextOpen, repeat_mode: nextMode, active_period: periodRaw, cooldown_days: cooldown },
      })
    }

    if (typeof body.whitelist_required === 'boolean') {
      await query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('whitelist_required', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify({ enabled: body.whitelist_required })]
      )
      await audit(admin.id, 'settings.whitelist', { ip, detail: { enabled: body.whitelist_required } })
    }

    if (body.kvkk_notice) {
      const k = body.kvkk_notice
      const payload = {
        version: (typeof k.version === 'string' && k.version.trim() ? k.version.trim() : 'v1').slice(0, 40),
        tr: typeof k.tr === 'string' ? k.tr.slice(0, 50_000) : '',
        en: typeof k.en === 'string' ? k.en.slice(0, 50_000) : '',
      }
      await query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ('kvkk_notice', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(payload)]
      )
      await audit(admin.id, 'settings.kvkk', { ip, detail: { version: payload.version } })
    }

    if (body.newAdmin) {
      const n = body.newAdmin
      const email = String(n.email ?? '').trim().toLowerCase()
      const fullName = String(n.full_name ?? '').trim().slice(0, 120)
      const password = String(n.password ?? '')
      const role = n.role === 'owner' ? 'owner' : 'viewer'
      if (!EMAIL_RE.test(email) || fullName.length < 2) return jsonError(400, 'Geçerli e-posta ve ad-soyad giriniz.')
      if (password.length < MIN_ADMIN_PASSWORD) return jsonError(400, pwError)
      try {
        // Var olan hesabı sessizce ezmez; şifre sıfırlama ayrı ve açık bir eylemdir
        await query(`INSERT INTO admins (email, full_name, role, password_hash) VALUES ($1, $2, $3, $4)`, [
          email,
          fullName,
          role,
          hashPassword(password),
        ])
      } catch (err) {
        if (isUniqueViolation(err)) return jsonError(409, 'Bu e-postayla bir yönetici zaten var. Şifresini sıfırlamak için listeden "Şifre sıfırla"yı kullanın.')
        throw err
      }
      await audit(admin.id, 'admin.create', { ip, target: email, detail: { role } })
    }

    if (body.resetPassword) {
      const id = String(body.resetPassword.id ?? '')
      const password = String(body.resetPassword.password ?? '')
      if (!UUID_RE.test(id)) return jsonError(400, 'Geçersiz yönetici.')
      if (password.length < MIN_ADMIN_PASSWORD) return jsonError(400, pwError)
      const res = await query(
        `UPDATE admins SET password_hash = $2, session_version = session_version + 1, password_changed_at = NOW()
         WHERE id = $1`,
        [id, hashPassword(password)]
      )
      if (res.rowCount === 0) return jsonError(404, 'Yönetici bulunamadı.')
      await audit(admin.id, 'admin.reset_password', { ip, target: id })
    }

    if (body.toggleAdmin) {
      const id = String(body.toggleAdmin.id ?? '')
      const active = body.toggleAdmin.active === true
      if (!UUID_RE.test(id)) return jsonError(400, 'Geçersiz yönetici.')
      if (id === admin.id && !active) return jsonError(400, 'Kendi hesabınızı pasife alamazsınız.')
      // Pasife alınan hesabın açık oturumları da düşer
      await query(
        `UPDATE admins SET active = $2, session_version = session_version + CASE WHEN $2 THEN 0 ELSE 1 END WHERE id = $1`,
        [id, active]
      )
      await audit(admin.id, 'admin.toggle', { ip, target: id, detail: { active } })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError('admin/settings', err, 'Ayarlar güncellenemedi.')
  }
}
