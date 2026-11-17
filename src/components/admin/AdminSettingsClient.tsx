'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Plus, Power } from 'lucide-react'
import type { AuditEntry } from '@/lib/audit'
import { t, type I18nKey } from '@/lib/i18n'
import type { AppSettingsBundle } from '@/lib/server-data'
import type { AdminUser, SurveyRow } from '@/lib/survey-types'
import { btn, Card, Notice, PageHeader } from '@/components/ui/AppShell'
import { useUI } from '@/components/ui/UIProvider'
import { apiJson, fmtDateTime, LabeledInput, Sheet } from './kit'

const MIN_PW = 12

function Block({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-5 sm:p-7">
      <h2 className="serif text-[24px] leading-tight text-ink">{title}</h2>
      {lede && <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{lede}</p>}
      <div className="mt-6">{children}</div>
    </Card>
  )
}

function Toggle({ on, onClick, label, hint, disabled }: { on: boolean; onClick: () => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} disabled={disabled} className="choice items-start">
      <span className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-clay' : 'bg-line'}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-3">{hint}</span>}
      </span>
    </button>
  )
}

export function AdminSettingsClient({
  admin,
  survey,
  settings,
  admins,
  auditLog,
}: {
  admin: AdminUser
  survey: SurveyRow
  settings: AppSettingsBundle
  admins: AdminUser[]
  auditLog: AuditEntry[]
}) {
  const { lang } = useUI()
  const router = useRouter()
  const owner = admin.role === 'owner'
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [newAdmin, setNewAdmin] = useState(false)
  const [resetFor, setResetFor] = useState<AdminUser | null>(null)

  const call = async (url: string, method: string, body: unknown, okKey: I18nKey) => {
    setBusy(true)
    setMsg(null)
    const { ok, data } = await apiJson(url, method, body)
    setBusy(false)
    if (!ok) {
      setMsg({ tone: 'error', text: String(data.error ?? t(lang, 'error.body')) })
      return false
    }
    setMsg({ tone: 'ok', text: t(lang, okKey) })
    router.refresh()
    return true
  }
  const patch = (body: unknown) => call('/api/admin/settings', 'PATCH', body, 'set.saved')
  const form = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    return Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
  }

  return (
    <>
      <PageHeader title={t(lang, 'set.title')} lede={t(lang, owner ? 'set.lede' : 'set.ledeViewer')} />
      {msg && <div className="mt-6"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <div className="mt-8 grid gap-5">
        {owner && (
          <Block title={t(lang, 'grad.surveySettingsTitle')} lede={t(lang, 'set.surveyLede')}>
            <div className="grid gap-4">
              <Toggle on={survey.is_open} disabled={busy} onClick={() => void patch({ is_open: !survey.is_open })}
                label={t(lang, 'set.isOpen')} hint={t(lang, survey.is_open ? 'land.open' : 'land.closed')} />
              <form className="grid gap-4 sm:grid-cols-3 sm:items-end" onSubmit={(e) => {
                const f = form(e)
                void patch({ active_period: f.active_period, repeat_mode: f.repeat_mode, cooldown_days: Number(f.cooldown_days) })
              }}>
                <LabeledInput label={t(lang, 'set.period')} name="active_period" defaultValue={survey.active_period} required maxLength={32} hint={t(lang, 'set.periodHint')} />
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-medium text-ink">{t(lang, 'set.repeat')}</span>
                  <select name="repeat_mode" className="field" defaultValue={survey.repeat_mode}>
                    <option value="period">{t(lang, 'set.repeatPeriod')}</option>
                    <option value="cooldown_days">{t(lang, 'set.repeatCooldown')}</option>
                    <option value="once">{t(lang, 'set.repeatOnce')}</option>
                  </select>
                  <span className="mt-1 block text-[12.5px] text-transparent select-none">.</span>
                </label>
                <LabeledInput label={t(lang, 'set.cooldown')} name="cooldown_days" type="number" min={1} max={3650} defaultValue={survey.cooldown_days} hint={t(lang, 'set.cooldownHint')} />
                <button type="submit" disabled={busy} className={`${btn.smallPrimary} sm:col-span-3 sm:justify-self-start`}>{t(lang, 'grad.save')}</button>
              </form>
            </div>
          </Block>
        )}

        {owner && (
          <Block title={t(lang, 'set.accessTitle')}>
            <Toggle on={settings.whitelistRequired.enabled} disabled={busy}
              onClick={() => void patch({ whitelist_required: !settings.whitelistRequired.enabled })}
              label={t(lang, 'grad.whitelistMode')} hint={t(lang, 'set.whitelistHint')} />
          </Block>
        )}

        {owner && (
          <Block title={t(lang, 'grad.kvkkBoxTitle')} lede={t(lang, 'set.kvkkLede')}>
            <form className="grid gap-4" onSubmit={(e) => {
              const f = form(e)
              void patch({ kvkk_notice: { version: f.version, tr: f.tr, en: f.en } })
            }}>
              <LabeledInput label={t(lang, 'set.kvkkVersion')} name="version" defaultValue={settings.kvkkNotice.version} required maxLength={40} hint={t(lang, 'set.kvkkVersionHint')} />
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium text-ink">Türkçe</span>
                <textarea name="tr" className="field min-h-56 text-[14px]" defaultValue={settings.kvkkNotice.tr} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[14px] font-medium text-ink">English</span>
                <textarea name="en" className="field min-h-56 text-[14px]" defaultValue={settings.kvkkNotice.en} />
              </label>
              <button type="submit" disabled={busy} className={`${btn.smallPrimary} justify-self-start`}>{t(lang, 'grad.save')}</button>
            </form>
          </Block>
        )}

        {owner && (
          <Block title={t(lang, 'grad.adminsTitle')} lede={t(lang, 'set.adminsLede')}>
            <ul className="divide-y divide-line-2 border-y border-line-2">
              {admins.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5">
                  <span className="min-w-0">
                    <span className={`block truncate text-[15.5px] ${a.active ? 'text-ink' : 'text-ink-3 line-through'}`}>{a.full_name}</span>
                    <span className="block truncate text-[13px] text-ink-3">
                      {a.email} · {t(lang, a.role === 'owner' ? 'admin.roleOwner' : 'admin.roleViewer')}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <button type="button" onClick={() => setResetFor(a)} className={btn.ghost} title={t(lang, 'set.resetPw')} aria-label={t(lang, 'set.resetPw')}><KeyRound size={15} /></button>
                    {a.id !== admin.id && (
                      <button type="button" disabled={busy} onClick={() => void patch({ toggleAdmin: { id: a.id, active: !a.active } })}
                        className={btn.ghost} title={t(lang, a.active ? 'set.deactivate' : 'set.activate')} aria-label={t(lang, a.active ? 'set.deactivate' : 'set.activate')}>
                        <Power size={15} className={a.active ? '' : 'text-sage'} />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setNewAdmin(true)} className={`${btn.small} mt-5`}><Plus size={15} />{t(lang, 'grad.addAdminBtn')}</button>
          </Block>
        )}

        <Block title={t(lang, 'set.passwordTitle')} lede={t(lang, 'set.passwordLede')}>
          <form className="grid gap-4 sm:max-w-md" onSubmit={async (e) => {
            const el = e.currentTarget
            const f = form(e)
            if (f.next !== f.next2) return setMsg({ tone: 'error', text: t(lang, 'set.pwMismatch') })
            if (await call('/api/admin/password', 'POST', { current: f.current, next: f.next }, 'set.pwChanged')) el.reset()
          }}>
            <LabeledInput label={t(lang, 'set.pwCurrent')} name="current" type="password" autoComplete="current-password" required />
            <LabeledInput label={t(lang, 'set.pwNew')} name="next" type="password" autoComplete="new-password" required minLength={MIN_PW} hint={t(lang, 'set.pwRule', { n: MIN_PW })} />
            <LabeledInput label={t(lang, 'set.pwNew2')} name="next2" type="password" autoComplete="new-password" required minLength={MIN_PW} />
            <button type="submit" disabled={busy} className={`${btn.smallPrimary} justify-self-start`}>{t(lang, 'set.pwSubmit')}</button>
          </form>
        </Block>

        {owner && (
          <Block title={t(lang, 'set.auditTitle')} lede={t(lang, 'set.auditLede')}>
            {auditLog.length === 0 ? (
              <p className="text-[14.5px] text-ink-3">{t(lang, 'set.auditEmpty')}</p>
            ) : (
              <ol className="relative ml-1 border-l border-line pl-6">
                {auditLog.map((e) => (
                  <li key={e.id} className="relative pb-5 last:pb-0">
                    <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-bg bg-clay" />
                    <span className="text-[12.5px] tabular text-ink-3">{fmtDateTime(e.created_at, lang)} · {e.admin_email ?? '—'}</span>
                    <p className="mt-0.5 text-[14.5px] text-ink">{t(lang, `audit.${e.action}` as I18nKey)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Block>
        )}
      </div>

      <Sheet open={newAdmin} onClose={() => setNewAdmin(false)} title={t(lang, 'grad.addAdminBtn')}>
        <form className="grid gap-4" onSubmit={async (e) => {
          const f = form(e)
          if (await call('/api/admin/settings', 'PATCH', { newAdmin: f }, 'set.adminAdded')) setNewAdmin(false)
        }}>
          <LabeledInput label={t(lang, 'login.fullName')} name="full_name" required />
          <LabeledInput label={t(lang, 'admin.email')} name="email" type="email" required />
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-medium text-ink">{t(lang, 'set.role')}</span>
            <select name="role" className="field" defaultValue="viewer">
              <option value="viewer">{t(lang, 'admin.roleViewer')}</option>
              <option value="owner">{t(lang, 'admin.roleOwner')}</option>
            </select>
          </label>
          <LabeledInput label={t(lang, 'admin.password')} name="password" type="password" autoComplete="new-password" required minLength={MIN_PW} hint={t(lang, 'set.pwRule', { n: MIN_PW })} />
          <button type="submit" disabled={busy} className={`${btn.primary} mt-2`}>{t(lang, 'grad.addAdminBtn')}</button>
        </form>
      </Sheet>

      <Sheet open={resetFor !== null} onClose={() => setResetFor(null)} title={t(lang, 'set.resetPw')}>
        <form className="grid gap-4" onSubmit={async (e) => {
          const f = form(e)
          if (await call('/api/admin/settings', 'PATCH', { resetPassword: { id: resetFor?.id, password: f.password } }, 'set.pwReset')) setResetFor(null)
        }}>
          <p className="text-[14.5px] text-ink-2">{resetFor?.full_name} · {resetFor?.email}</p>
          <LabeledInput label={t(lang, 'set.pwNew')} name="password" type="password" autoComplete="new-password" required minLength={MIN_PW} hint={t(lang, 'set.pwResetHint')} />
          <button type="submit" disabled={busy} className={`${btn.primary} mt-2`}>{t(lang, 'set.resetPw')}</button>
        </form>
      </Sheet>
    </>
  )
}
