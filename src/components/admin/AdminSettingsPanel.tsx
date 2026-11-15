'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Shield, UserPlus } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { AppSettingsBundle } from '@/lib/server-data'
import type { AdminUser, SurveyRow } from '@/lib/survey-types'
import { useUI } from '@/components/ui/UIProvider'

export function AdminSettingsPanel({
  survey,
  settings,
  admins,
  currentAdminId,
}: {
  survey: SurveyRow
  settings: AppSettingsBundle
  admins: AdminUser[]
  currentAdminId: string
}) {
  const { lang } = useUI()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(survey.is_open)
  const [activePeriod, setActivePeriod] = useState(survey.active_period)
  const [repeatMode, setRepeatMode] = useState<'period' | 'cooldown_days' | 'once'>(survey.repeat_mode)
  const [cooldownDays, setCooldownDays] = useState(survey.cooldown_days)
  const [whitelistEnabled, setWhitelistEnabled] = useState(settings.whitelistRequired.enabled)

  const [kvkkVersion, setKvkkVersion] = useState(settings.kvkkNotice.version || 'v1')
  const [kvkkTr, setKvkkTr] = useState(settings.kvkkNotice.tr)
  const [kvkkEn, setKvkkEn] = useState(settings.kvkkNotice.en)

  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<'viewer' | 'owner'>('viewer')
  const [newAdminPass, setNewAdminPass] = useState('')

  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const saveSurveyAndKvkk = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_open: isOpen,
          active_period: activePeriod,
          repeat_mode: repeatMode,
          cooldown_days: cooldownDays,
          whitelist_required: whitelistEnabled,
          kvkk_notice: { version: kvkkVersion, tr: kvkkTr, en: kvkkEn },
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setStatusMsg(data.error || 'Hata oluştu.')
      } else {
        setStatusMsg(lang === 'en' ? 'Settings saved.' : 'Ayarlar kaydedildi.')
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newAdmin: {
            email: newAdminEmail,
            full_name: newAdminName,
            role: newAdminRole,
            password: newAdminPass,
          },
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setStatusMsg(data.error || 'Öğretmen eklenemedi.')
      } else {
        setNewAdminEmail('')
        setNewAdminName('')
        setNewAdminPass('')
        setStatusMsg(lang === 'en' ? 'Faculty account added.' : 'Öğretmen hesabı eklendi.')
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleAdmin = async (id: string, active: boolean) => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleAdmin: { id, active } }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-sage/40 bg-sage/10 px-4 py-3 text-sm font-medium text-sage">
          <CheckCircle2 className="size-4" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Anket Dönemi, Whitelist & KVKK Ayarları */}
      <form
        onSubmit={saveSurveyAndKvkk}
        className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6 space-y-5"
      >
        <h2 className="serif text-2xl font-normal text-ink">{t(lang, 'grad.surveySettingsTitle')}</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-ink-3">
              {lang === 'en' ? 'Active Period' : 'Aktif Dönem Etiketi'}
            </label>
            <input
              type="text"
              value={activePeriod}
              onChange={(e) => setActivePeriod(e.target.value)}
              placeholder="2026-Guz"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink focus:border-clay focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-3">
              {lang === 'en' ? 'Repeat Policy' : 'Tekrar Doldurma Kuralı'}
            </label>
            <select
              value={repeatMode}
              onChange={(e) => setRepeatMode(e.target.value as 'period' | 'cooldown_days' | 'once')}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
            >
              <option value="period">{lang === 'en' ? 'Once per period (2026-Guz…)' : 'Her dönemde 1 kez (Dönem bazlı)'}</option>
              <option value="cooldown_days">{lang === 'en' ? 'Every N days (6 months)' : 'Gün bekleme (180 gün)'}</option>
              <option value="once">{lang === 'en' ? 'Once total' : 'Toplamda 1 kez'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-3">
              {lang === 'en' ? 'Cooldown (days)' : 'Bekleme Süresi (gün)'}
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={cooldownDays}
              onChange={(e) => setCooldownDays(Number(e.target.value))}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 font-mono text-sm tabular text-ink focus:border-clay focus:outline-none"
            />
          </div>

          <div className="flex flex-col justify-end gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="size-4 accent-[#d97757]"
              />
              <span>{lang === 'en' ? 'Survey Open' : 'Anket Yanıtlara Açık'}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={whitelistEnabled}
                onChange={(e) => setWhitelistEnabled(e.target.checked)}
                className="size-4 accent-[#d97757]"
              />
              <span className="leading-tight">{t(lang, 'grad.whitelistMode')}</span>
            </label>
          </div>
        </div>

        <div className="border-t border-line-2 pt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-medium text-ink">{t(lang, 'grad.kvkkBoxTitle')}</h3>
            <input
              type="text"
              value={kvkkVersion}
              onChange={(e) => setKvkkVersion(e.target.value)}
              placeholder="v1"
              className="w-32 min-h-[36px] rounded-lg border border-line bg-surface px-2.5 font-mono text-xs text-ink"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-ink-3">KVKK Metni (TR)</label>
              <textarea
                rows={4}
                value={kvkkTr}
                onChange={(e) => setKvkkTr(e.target.value)}
                placeholder="Resmi FBÜ KVKK metni geldiğinde buraya yapıştırın (boşken varsayılan kısa not gösterilir)."
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-3">KVKK Notice (EN)</label>
              <textarea
                rows={4}
                value={kvkkEn}
                onChange={(e) => setKvkkEn(e.target.value)}
                placeholder="Optional English KVKK privacy notice."
                className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink focus:border-clay focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="enter-btn inline-flex min-h-[44px] items-center rounded-full bg-ink px-6 text-sm font-medium text-bg disabled:opacity-60"
        >
          {lang === 'en' ? 'Save Settings' : 'Ayarları Kaydet'}
        </button>
      </form>

      {/* Öğretmen / Yönetici Hesapları */}
      <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-clay" />
          <h2 className="serif text-2xl font-normal text-ink">{t(lang, 'grad.adminsTitle')}</h2>
        </div>

        <div className="divide-y divide-line-2 rounded-xl border border-line-2 bg-surface">
          {admins.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">{a.full_name}</p>
                <p className="text-xs text-ink-3">{a.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line bg-raised px-2.5 py-0.5 text-xs font-medium text-ink-2">
                  {a.role === 'owner' ? 'Owner' : 'Viewer'}
                </span>
                {a.id !== currentAdminId && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => toggleAdmin(a.id, !a.active)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border ${
                      a.active
                        ? 'border-line text-ink-2 hover:border-danger hover:text-danger'
                        : 'border-sage text-sage'
                    }`}
                  >
                    {a.active ? (lang === 'en' ? 'Deactivate' : 'Pasifleştir') : lang === 'en' ? 'Activate' : 'Aktifleştir'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={addAdmin} className="grid gap-3 border-t border-line-2 pt-4 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            required
            placeholder={t(lang, 'login.fullName')}
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          />
          <input
            type="email"
            required
            placeholder="hoca@fbu.edu.tr"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          />
          <select
            value={newAdminRole}
            onChange={(e) => setNewAdminRole(e.target.value as 'viewer' | 'owner')}
            className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            <option value="viewer">Viewer ({lang === 'en' ? 'Read-Only' : 'Salt Görüntüleme'})</option>
            <option value="owner">Owner ({lang === 'en' ? 'Full Control' : 'Program Başkanı'})</option>
          </select>
          <input
            type="password"
            required
            minLength={6}
            placeholder={t(lang, 'admin.password')}
            value={newAdminPass}
            onChange={(e) => setNewAdminPass(e.target.value)}
            className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="enter-btn inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-bg disabled:opacity-60"
          >
            <UserPlus className="size-4" />
            <span>{t(lang, 'grad.addAdminBtn')}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
