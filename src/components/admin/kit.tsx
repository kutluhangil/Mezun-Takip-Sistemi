'use client'

import React, { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { aggregateSurvey, filterResponses, type DashboardSummary, type FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { Lang, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { useUI } from '@/components/ui/UIProvider'

export const EMPTY_FILTERS: FilterCriteria = { period: 'all', graduationYear: 'all', graduationTerm: 'all', workStatus: 'all' }

export function useSurveyFilters(survey: SurveyRow, responses: SubmittedResponseItem[], totalGraduates: number) {
  const { lang } = useUI()
  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTERS)
  const filtered = useMemo(() => filterResponses(responses, filters), [responses, filters])
  const summary: DashboardSummary = useMemo(
    () =>
      aggregateSurvey({
        definition: survey.definition,
        responses: filtered,
        allResponsesForFacets: responses,
        totalGraduatesInWhitelist: totalGraduates,
        lang,
      }),
    [survey.definition, filtered, responses, totalGraduates, lang]
  )
  return { filters, setFilters, filtered, summary, lang }
}

export function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line-2 bg-raised/60 p-5 backdrop-blur-sm">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className={`serif mt-2 text-[38px] leading-none tabular ${accent ? 'text-clay-ink' : 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-2 text-[13px] leading-snug text-ink-3">{sub}</p>}
    </div>
  )
}

const isActive = (f: FilterCriteria) => Object.values(f).some((v) => v && v !== 'all')

export function FilterBar({
  survey,
  summary,
  filters,
  onChange,
}: {
  survey: SurveyRow
  summary: DashboardSummary
  filters: FilterCriteria
  onChange: (f: FilterCriteria) => void
}) {
  const { lang } = useUI()
  const [open, setOpen] = useState(false)
  const workOptions = survey.definition.questions.find((q) => q.id === 'q_work_status')?.options ?? []
  const active = isActive(filters)

  const sel = (key: keyof FilterCriteria, label: string, options: { value: string; label: string }[]) => (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[12.5px] text-ink-3">{label}</span>
      <select className="field !min-h-11 text-[15px]" value={filters[key] ?? 'all'} onChange={(e) => onChange({ ...filters, [key]: e.target.value })}>
        <option value="all">{t(lang, 'dash.filterAll')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )

  return (
    <div className="rounded-2xl border border-line-2 bg-raised/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 items-center gap-2 text-[14.5px] text-ink" aria-expanded={open}>
          <SlidersHorizontal size={16} strokeWidth={1.75} className="text-clay" />
          {t(lang, 'dash.filters')}
          {active && <span className="size-1.5 rounded-full bg-clay" />}
        </button>
        {active && <ClearBtn lang={lang} onClick={() => onChange(EMPTY_FILTERS)} />}
      </div>
      <div className={`${open ? 'mt-3 grid' : 'hidden'} gap-3 sm:grid-cols-2 md:mt-0 md:grid md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end`}>
        {sel('period', t(lang, 'dash.filterPeriod'), summary.periods.map((p) => ({ value: p, label: p })))}
        {sel('graduationYear', t(lang, 'dash.filterYear'), summary.graduationYears.map((y) => ({ value: String(y), label: String(y) })))}
        {sel('graduationTerm', t(lang, 'dash.filterTerm'), [
          { value: 'guz', label: t(lang, 'login.termGuz') },
          { value: 'bahar', label: t(lang, 'login.termBahar') },
          { value: 'yaz', label: t(lang, 'login.termYaz') },
        ])}
        {sel('workStatus', t(lang, 'dash.filterWork'), workOptions.map((o) => ({ value: o.value, label: o[lang] })))}
        <div className="hidden h-11 items-center md:flex">{active && <ClearBtn lang={lang} onClick={() => onChange(EMPTY_FILTERS)} />}</div>
      </div>
    </div>
  )
}

function ClearBtn({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] text-clay-ink hover:bg-sunk">
      <X size={14} />
      {t(lang, 'dash.clearFilters')}
    </button>
  )
}

export const pct = (n: number) => `%${Number.isFinite(n) ? n : 0}`
export const fmtDateTime = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Telefonda alttan açılan sayfa, masaüstünde ortalı pencere. Esc ve dış tık kapatır. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="pop scroll-thin max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-raised p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[var(--shadow)] sm:max-w-lg sm:rounded-3xl sm:p-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <h2 className="serif text-[24px] leading-tight text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-sunk hover:text-ink" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

export function LabeledInput({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-ink">{label}</span>
      <input className="field" {...props} />
      {hint && <span className="mt-1 block text-[12.5px] text-ink-3">{hint}</span>}
    </label>
  )
}

export async function apiJson(url: string, method: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  } catch {
    return { ok: false, data: { error: 'network' } }
  }
}
