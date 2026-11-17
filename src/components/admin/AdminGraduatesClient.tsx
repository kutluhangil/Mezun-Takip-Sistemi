'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, Download, Pencil, Plus, Search, Upload, UserX } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { AppSettingsBundle, GraduateListItem } from '@/lib/server-data'
import type { AdminUser, SurveyRow } from '@/lib/survey-types'
import { btn, Notice, PageHeader } from '@/components/ui/AppShell'
import { AdminShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { apiJson, fmtDate, LabeledInput, Sheet } from './kit'

type Status = 'all' | 'filled' | 'pending'
type Editing = Partial<GraduateListItem> | null
interface Preview { total: number; created: number; updated: number; skipped: number; skippedLines: { line: number; reason: string }[] }

const PAGE = 50

export function AdminGraduatesClient({
  admin,
  survey,
  settings,
  graduates,
}: {
  admin: AdminUser
  survey: SurveyRow
  settings: AppSettingsBundle
  graduates: GraduateListItem[]
}) {
  const { lang } = useUI()
  const router = useRouter()
  const owner = admin.role === 'owner'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [limit, setLimit] = useState(PAGE)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [anon, setAnon] = useState<GraduateListItem | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [remind, setRemind] = useState<{ sent: number; failed: number; remaining: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pending = graduates.filter((g) => !g.filled_active_period).length
  const rows = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr')
    return graduates.filter((g) => {
      if (status === 'filled' && !g.filled_active_period) return false
      if (status === 'pending' && g.filled_active_period) return false
      return !s || [g.full_name, g.email, g.student_number].some((v) => v?.toLocaleLowerCase('tr').includes(s))
    })
  }, [graduates, q, status])

  const done = (text: string, tone: 'ok' | 'error' = 'ok') => {
    setMsg({ tone, text })
    if (tone === 'ok') router.refresh()
  }

  const saveGraduate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    const { ok, data } = await apiJson('/api/admin/graduates', 'POST', { id: editing?.id, ...Object.fromEntries(fd) })
    setBusy(false)
    if (!ok) return setMsg({ tone: 'error', text: String(data.error ?? t(lang, 'error.body')) })
    setEditing(null)
    done(t(lang, 'grad.saved'))
  }

  const anonymize = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const confirm = String(new FormData(e.currentTarget).get('confirm') ?? '')
    setBusy(true)
    const { ok, data } = await apiJson('/api/admin/graduates/anonymize', 'POST', { id: anon?.id, confirm })
    setBusy(false)
    if (!ok) return setMsg({ tone: 'error', text: String(data.error ?? t(lang, 'error.body')) })
    setAnon(null)
    done(t(lang, 'grad.anonDone'))
  }

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setImportFile(file)
    setPreview(null)
    setBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/admin/graduates?preview=1', { method: 'PUT', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setImportFile(null)
        setMsg({ tone: 'error', text: data.error ?? t(lang, 'error.body') })
      } else setPreview(data)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const confirmImport = async () => {
    if (!importFile) return
    setBusy(true)
    const fd = new FormData()
    fd.append('file', importFile)
    const res = await fetch('/api/admin/graduates', { method: 'PUT', body: fd }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    setBusy(false)
    setImportFile(null)
    setPreview(null)
    if (!res?.ok) return setMsg({ tone: 'error', text: data.error ?? t(lang, 'error.body') })
    done(t(lang, 'grad.importDone', { created: data.created, updated: data.updated, skipped: data.skipped }))
  }

  /** Partiler halinde gönderir; sunucu kalan sayıyı söyler, 0 olana kadar devam eder. */
  const sendReminders = async (graduateId?: string) => {
    setBusy(true)
    setMsg(null)
    let sent = 0
    let failed = 0
    let remaining = graduateId ? 1 : pending
    try {
      for (let i = 0; i < 60 && remaining > 0; i++) {
        const { ok, data } = await apiJson('/api/admin/reminders', 'POST', { graduateId, lang })
        if (!ok) throw new Error(String(data.error ?? ''))
        sent += Number(data.sent ?? 0) + Number(data.devLogged ?? 0)
        failed += Number(data.failed ?? 0)
        remaining = graduateId ? 0 : Number(data.remaining ?? 0)
        if (!graduateId) setRemind({ sent, failed, remaining })
        if (Number(data.processed ?? 0) === 0) break
      }
      done(t(lang, 'grad.remindDone', { sent, failed }), failed > 0 && sent === 0 ? 'error' : 'ok')
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message || t(lang, 'error.body') })
    } finally {
      setBusy(false)
      setRemind(null)
    }
  }

  return (
    <AdminShell admin={admin}>
      <PageHeader
        kicker={<span className="tabular">{t(lang, 'grad.kicker', { total: graduates.length, pending, period: survey.active_period })}</span>}
        title={t(lang, 'grad.title')}
        lede={t(lang, 'grad.lede')}
        actions={owner && (
          <button type="button" onClick={() => void sendReminders()} disabled={busy || pending === 0} className={btn.smallPrimary}>
            <BellRing size={15} strokeWidth={1.75} />
            {t(lang, 'grad.remindBtn', { n: pending })}
          </button>
        )}
      />

      <div className="mt-6 grid gap-3">
        {!settings.whitelistRequired.enabled && <Notice tone="warn">{t(lang, 'grad.whitelistOff')}</Notice>}
        {remind && <Notice tone="info"><span className="tabular">{t(lang, 'grad.remindProgress', remind)}</span></Notice>}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>

      {owner && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing({})} className={btn.small}><Plus size={15} />{t(lang, 'grad.add')}</button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={btn.small}><Upload size={15} />{t(lang, 'grad.uploadBtn')}</button>
          <a href="/api/admin/graduates/template" className={btn.ghost}><Download size={15} />{t(lang, 'grad.template')}</a>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative block">
          <Search size={17} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input type="search" className="field !pl-11" placeholder={t(lang, 'resp.search')} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-full border border-line-2 bg-sunk/70 p-1">
          {(['all', 'pending', 'filled'] as Status[]).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
              className={`h-10 whitespace-nowrap rounded-full px-3.5 text-[13.5px] transition-colors ${status === s ? 'bg-raised text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}>
              {t(lang, s === 'all' ? 'dash.filterAll' : s === 'pending' ? 'grad.statusPending' : 'grad.statusFilled')}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line-2 border-y border-line-2">
        {rows.slice(0, limit).map((g) => (
          <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
            <span className="min-w-0">
              <span className="serif block truncate text-[18px] text-ink">{g.full_name}</span>
              <span className="block truncate text-[13px] text-ink-3">{g.email}</span>
            </span>
            <span className="col-span-2 row-start-2 text-[13px] tabular text-ink-3 sm:col-span-1 sm:row-auto">
              {[g.student_number, g.graduation_year, g.graduation_term && t(lang, `login.term${g.graduation_term === 'guz' ? 'Guz' : g.graduation_term === 'bahar' ? 'Bahar' : 'Yaz'}`)].filter(Boolean).join(' · ') || '—'}
              {g.last_reminded_at && <span className="block">{t(lang, 'grad.lastReminded')} {fmtDate(g.last_reminded_at, lang)}</span>}
            </span>
            <span className={`inline-flex items-center gap-1.5 justify-self-end text-[13px] ${g.filled_active_period ? 'text-sage' : 'text-clay-ink'}`}>
              <span className={`size-2 rounded-full ${g.filled_active_period ? 'bg-sage' : 'bg-clay'}`} />
              {t(lang, g.filled_active_period ? 'grad.statusFilled' : 'grad.statusPending')}
            </span>
            {owner && (
              <span className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                {!g.filled_active_period && (
                  <button type="button" onClick={() => void sendReminders(g.id)} disabled={busy} className={btn.ghost} title={t(lang, 'grad.remindSingle')}>
                    <BellRing size={15} /><span className="sm:hidden">{t(lang, 'grad.remindSingle')}</span>
                  </button>
                )}
                <button type="button" onClick={() => setEditing(g)} className={btn.ghost} aria-label={t(lang, 'grad.edit')} title={t(lang, 'grad.edit')}><Pencil size={15} /></button>
                <button type="button" onClick={() => setAnon(g)} className={btn.ghost} aria-label={t(lang, 'grad.anonymize')} title={t(lang, 'grad.anonymize')}><UserX size={15} /></button>
              </span>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="py-10 text-center text-[15px] text-ink-3">{t(lang, 'grad.empty')}</li>}
      </ul>
      {rows.length > limit && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className={btn.small}>{t(lang, 'resp.more', { n: rows.length - limit })}</button>
        </div>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={t(lang, editing?.id ? 'grad.edit' : 'grad.add')}>
        <form onSubmit={saveGraduate} className="grid gap-4">
          <LabeledInput label={t(lang, 'login.fullName')} name="full_name" required defaultValue={editing?.full_name ?? ''} />
          <LabeledInput label={t(lang, 'login.email')} name="email" type="email" required defaultValue={editing?.email ?? ''} />
          <LabeledInput label={t(lang, 'login.studentNumber')} name="student_number" inputMode="numeric" defaultValue={editing?.student_number ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label={t(lang, 'login.gradYear')} name="graduation_year" inputMode="numeric" defaultValue={editing?.graduation_year ?? ''} />
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-medium text-ink">{t(lang, 'login.gradTerm')}</span>
              <select name="graduation_term" className="field" defaultValue={editing?.graduation_term ?? ''}>
                <option value="">—</option>
                <option value="guz">{t(lang, 'login.termGuz')}</option>
                <option value="bahar">{t(lang, 'login.termBahar')}</option>
                <option value="yaz">{t(lang, 'login.termYaz')}</option>
              </select>
            </label>
          </div>
          <button type="submit" disabled={busy} className={`${btn.primary} mt-2`}>{t(lang, 'grad.save')}</button>
        </form>
      </Sheet>

      <Sheet open={anon !== null} onClose={() => setAnon(null)} title={t(lang, 'grad.anonymize')}>
        <form onSubmit={anonymize} className="grid gap-4">
          <p className="text-[15px] leading-relaxed text-ink-2">{t(lang, 'grad.anonBody', { name: anon?.full_name ?? '' })}</p>
          <LabeledInput label={t(lang, 'grad.anonConfirm')} name="confirm" autoComplete="off" required placeholder="ANONIMLESTIR" />
          <button type="submit" disabled={busy} className={btn.danger}>{t(lang, 'grad.anonymize')}</button>
        </form>
      </Sheet>

      <Sheet open={preview !== null} onClose={() => { setPreview(null); setImportFile(null) }} title={t(lang, 'grad.previewTitle')}>
        {preview && (
          <div className="grid gap-5">
            <p className="text-[14px] text-ink-3">{importFile?.name}</p>
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[['grad.pvCreated', preview.created], ['grad.pvUpdated', preview.updated], ['grad.pvSkipped', preview.skipped]].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-line-2 bg-sunk/50 p-3">
                  <dt className="text-[12.5px] text-ink-3">{t(lang, k as 'grad.pvCreated')}</dt>
                  <dd className="serif mt-1 text-[28px] tabular text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {preview.skippedLines.length > 0 && (
              <ul className="scroll-thin max-h-32 overflow-y-auto text-[13px] text-ink-3">
                {preview.skippedLines.map((s) => <li key={s.line}>{t(lang, 'grad.pvLine', { line: s.line })}: {t(lang, `grad.skip.${s.reason}` as 'grad.skip.email')}</li>)}
              </ul>
            )}
            <button type="button" onClick={() => void confirmImport()} disabled={busy || preview.created + preview.updated === 0} className={btn.primary}>
              {t(lang, 'grad.importConfirm', { n: preview.created + preview.updated })}
            </button>
          </div>
        )}
      </Sheet>
    </AdminShell>
  )
}
