'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, Check, Edit3, Mail, Search, Upload } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { AppSettingsBundle, GraduateListItem } from '@/lib/server-data'
import type { AdminUser, SurveyRow } from '@/lib/survey-types'
import { AdminShell } from '@/components/ui/Shells'
import { Art } from '@/components/ui/Art'
import { useUI } from '@/components/ui/UIProvider'
import { AdminSettingsPanel } from './AdminSettingsPanel'

export function AdminGraduatesClient({
  admin,
  survey,
  settings,
  graduates,
  admins,
}: {
  admin: AdminUser
  survey: SurveyRow
  settings: AppSettingsBundle
  graduates: GraduateListItem[]
  admins: AdminUser[]
}) {
  const { lang } = useUI()
  const router = useRouter()
  const isOwner = admin.role === 'owner'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'filled' | 'pending'>('all')
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formStudentNo, setFormStudentNo] = useState('')
  const [formYear, setFormYear] = useState('')
  const [formTerm, setFormTerm] = useState('bahar')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return graduates.filter((g) => {
      if (statusFilter === 'filled' && !g.filled_active_period) return false
      if (statusFilter === 'pending' && g.filled_active_period) return false
      if (!q) return true
      return (
        g.full_name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.student_number.toLowerCase().includes(q)
      )
    })
  }, [graduates, search, statusFilter])

  const filledCount = graduates.filter((g) => g.filled_active_period).length
  const pendingCount = graduates.length - filledCount

  const startEdit = (g: GraduateListItem) => {
    setEditingId(g.id)
    setFormEmail(g.email)
    setFormName(g.full_name)
    setFormStudentNo(g.student_number)
    setFormYear(g.graduation_year ? String(g.graduation_year) : '')
    setFormTerm(g.graduation_term ?? 'bahar')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetForm = () => {
    setEditingId(null)
    setFormEmail('')
    setFormName('')
    setFormStudentNo('')
    setFormYear('')
    setFormTerm('bahar')
  }

  const saveGraduate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setBanner(null)
    try {
      const res = await fetch('/api/admin/graduates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId ?? undefined,
          email: formEmail,
          full_name: formName,
          student_number: formStudentNo,
          graduation_year: formYear ? Number(formYear) : null,
          graduation_term: formTerm || null,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setBanner(data.error || 'İşlem başarısız.')
      } else {
        setBanner(editingId ? 'Mezun e-posta / profili güncellendi.' : 'Mezun listeye eklendi.')
        resetForm()
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('gradFile') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) return
    setBusy(true)
    setBanner(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/graduates', { method: 'PUT', body: fd })
      const data = (await res.json()) as { imported?: number; skipped?: number; error?: string }
      if (!res.ok) {
        setBanner(data.error || 'Dosya yüklenemedi.')
      } else {
        setBanner(`${data.imported ?? 0} mezun içe aktarıldı (${data.skipped ?? 0} satır atlandı).`)
        e.currentTarget.reset()
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  const sendReminder = async (graduateId?: string) => {
    setBusy(true)
    setBanner(null)
    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduateId, lang }),
      })
      const data = (await res.json()) as { total?: number; sent?: number; devLogged?: number; failed?: number; error?: string }
      if (!res.ok) {
        setBanner(data.error || 'Hatırlatma gönderilemedi.')
      } else {
        setBanner(
          lang === 'en'
            ? `Reminder processed for ${data.total ?? 0} graduate(s) (sent: ${data.sent ?? 0}, dev-log: ${data.devLogged ?? 0}, failed: ${data.failed ?? 0}).`
            : `${data.total ?? 0} mezuna hatırlatma işlendi (gönderilen: ${data.sent ?? 0}, geliştirme günlüğü: ${data.devLogged ?? 0}, hata: ${data.failed ?? 0}).`
        )
        router.refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell adminName={admin.full_name} adminRole={admin.role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-ink">
              {survey.active_period} · {graduates.length} {lang === 'en' ? 'listed' : 'kayıtlı'}
            </p>
            <h1 className="serif mt-1 text-3xl sm:text-4xl font-normal text-ink">{t(lang, 'grad.title')}</h1>
          </div>

          {isOwner && pendingCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => sendReminder()}
              className="enter-btn inline-flex min-h-[44px] items-center gap-2 rounded-full bg-clay px-5 text-sm font-medium text-white disabled:opacity-60"
            >
              <BellRing className="size-4" />
              <span>
                {t(lang, 'grad.remindBtn')} ({pendingCount})
              </span>
            </button>
          )}
        </div>

        {!isOwner && (
          <div className="rounded-2xl border border-line bg-sunk px-4 py-3 text-sm text-ink-2">
            {lang === 'en'
              ? 'Read-Only (Viewer) account: Graduate imports, email edits, reminders, and system settings are restricted to the Programme Chair.'
              : 'Salt Görüntüleme (Viewer) hesabı: Liste yükleme, e-posta güncelleme, hatırlatma e-postası ve sistem ayarları yalnızca Program Başkanına açıktır.'}
          </div>
        )}

        {banner && (
          <div className="rounded-2xl border border-clay/45 bg-band/30 px-4 py-3 text-sm font-medium text-ink">
            {banner}
          </div>
        )}

        {/* Tekil Mezun Ekle / E-posta Güncelle + Toplu Excel/CSV */}
        {isOwner && (
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={saveGraduate} className="rounded-2xl border border-line-2 bg-raised/90 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-ink">
                  {editingId
                    ? lang === 'en'
                      ? 'Edit Graduate Email / Profile'
                      : 'Mezun E-posta / Profil Düzenle'
                    : t(lang, 'grad.addTitle')}
                </h2>
                {editingId && (
                  <button type="button" onClick={resetForm} className="text-xs text-ink-3 underline">
                    {lang === 'en' ? 'Cancel' : 'İptal'}
                  </button>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  required
                  placeholder={t(lang, 'login.fullName')}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink"
                />
                <input
                  type="email"
                  required
                  placeholder="yeni.eposta@gmail.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink"
                />
                <input
                  placeholder={t(lang, 'login.studentNumber')}
                  value={formStudentNo}
                  onChange={(e) => setFormStudentNo(e.target.value)}
                  className="min-h-[42px] rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="2024"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="min-h-[42px] rounded-xl border border-line bg-surface px-3 font-mono text-sm text-ink"
                  />
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value)}
                    className="min-h-[42px] rounded-xl border border-line bg-surface px-2 text-sm text-ink"
                  >
                    <option value="guz">{t(lang, 'login.termGuz')}</option>
                    <option value="bahar">{t(lang, 'login.termBahar')}</option>
                    <option value="yaz">{t(lang, 'login.termYaz')}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="enter-btn inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-medium text-bg disabled:opacity-60"
              >
                <Check className="size-4" />
                <span>{editingId ? (lang === 'en' ? 'Update Graduate' : 'Kaydı Güncelle') : (lang === 'en' ? 'Save Graduate' : 'Mezunu Kaydet')}</span>
              </button>
            </form>

            <form onSubmit={handleUpload} className="flex flex-col justify-between rounded-2xl border border-line-2 bg-raised/90 p-5 space-y-3">
              <div>
                <h2 className="text-base font-medium text-ink">{t(lang, 'grad.uploadTitle')}</h2>
                <p className="mt-1 text-xs text-ink-3">{t(lang, 'grad.uploadHint')}</p>
                <input
                  name="gradFile"
                  type="file"
                  accept=".xlsx,.csv"
                  required
                  className="mt-4 block w-full text-sm text-ink-2 file:mr-3 file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:py-2 file:text-xs file:font-medium file:text-ink"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={busy}
                  className="enter-btn inline-flex min-h-[42px] items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink hover:border-ink-3 disabled:opacity-60"
                >
                  <Upload className="size-4 text-clay" />
                  <span>{t(lang, 'grad.uploadBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Katılım Tablosu (Dolduran / Bekleyen) */}
        <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium tabular">
              {(
                [
                  ['all', `${t(lang, 'dash.filterAll')} (${graduates.length})`],
                  ['filled', `${t(lang, 'grad.statusFilled')} (${filledCount})`],
                  ['pending', `${t(lang, 'grad.statusPending')} (${pendingCount})`],
                ] as const
              ).map(([key, lbl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`min-h-[36px] rounded-full px-3.5 transition-colors border ${
                    statusFilter === key
                      ? 'border-ink bg-ink text-bg'
                      : 'border-line bg-surface text-ink-2 hover:text-ink'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'en' ? 'Search graduate…' : 'Mezun ara…'}
                className="w-full min-h-[40px] rounded-full border border-line bg-surface pl-9 pr-3 text-sm text-ink"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center text-sm text-ink-3">
              <Art name="empty" size={140} />
              {graduates.length === 0
                ? lang === 'en'
                  ? 'No graduates imported yet. Import an Excel/CSV file above or wait for graduate OTP logins.'
                  : 'Henüz mezun listesi yüklenmedi. Yukarıdan Excel/CSV aktarabilir veya mezun girişlerini izleyebilirsiniz.'
                : t(lang, 'dash.noResponses')}
            </div>
          ) : (
            <div className="divide-y divide-line-2">
              {filtered.map((g) => (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">
                      {g.full_name}
                      {g.student_number && (
                        <span className="ml-2 font-mono text-xs tabular text-ink-3">{g.student_number}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-3">
                      {g.email} · {g.graduation_year ?? '—'} {g.graduation_term ?? ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        g.filled_active_period
                          ? 'bg-sage/15 text-sage'
                          : 'bg-band/40 text-clay-ink'
                      }`}
                    >
                      {g.filled_active_period ? t(lang, 'grad.statusFilled') : t(lang, 'grad.statusPending')}
                    </span>

                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(g)}
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-xs text-ink-2 hover:border-ink-3 hover:text-ink"
                        >
                          <Edit3 className="size-3" />
                          <span>{lang === 'en' ? 'Edit' : 'Düzenle'}</span>
                        </button>
                        {!g.filled_active_period && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => sendReminder(g.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-full border border-clay/50 bg-surface px-2.5 text-xs font-medium text-clay-ink hover:bg-band/25"
                          >
                            <Mail className="size-3" />
                            <span>{t(lang, 'grad.remindSingle')}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isOwner && (
          <AdminSettingsPanel
            survey={survey}
            settings={settings}
            admins={admins}
            currentAdminId={admin.id}
          />
        )}
      </div>
    </AdminShell>
  )
}
