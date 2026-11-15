'use client'

import React from 'react'
import { Filter, RotateCcw } from 'lucide-react'
import type { FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import { useUI } from '@/components/ui/UIProvider'

export function AdminFilterBar({
  filters,
  onChange,
  periods,
  graduationYears,
}: {
  filters: FilterCriteria
  onChange: (next: FilterCriteria) => void
  periods: string[]
  graduationYears: number[]
}) {
  const { lang } = useUI()

  const hasActive =
    (filters.period && filters.period !== 'all') ||
    (filters.graduationYear && filters.graduationYear !== 'all') ||
    (filters.graduationTerm && filters.graduationTerm !== 'all') ||
    (filters.workStatus && filters.workStatus !== 'all')

  return (
    <div className="rounded-2xl border border-line-2 bg-raised/85 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">
          <Filter className="size-3.5 text-clay" />
          {lang === 'en' ? 'Filters' : 'Filtreler'}
        </span>
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange({ period: 'all', graduationYear: 'all', graduationTerm: 'all', workStatus: 'all' })}
            className="inline-flex items-center gap-1 text-xs font-medium text-clay-ink hover:underline"
          >
            <RotateCcw className="size-3" />
            {t(lang, 'dash.clearFilters')}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'dash.filterPeriod')}</label>
          <select
            value={filters.period ?? 'all'}
            onChange={(e) => onChange({ ...filters, period: e.target.value })}
            className="mt-1 w-full min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{t(lang, 'dash.filterAll')}</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'dash.filterYear')}</label>
          <select
            value={filters.graduationYear ?? 'all'}
            onChange={(e) => onChange({ ...filters, graduationYear: e.target.value })}
            className="mt-1 w-full min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm tabular text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{t(lang, 'dash.filterAll')}</option>
            {graduationYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'dash.filterTerm')}</label>
          <select
            value={filters.graduationTerm ?? 'all'}
            onChange={(e) => onChange({ ...filters, graduationTerm: e.target.value })}
            className="mt-1 w-full min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{t(lang, 'dash.filterAll')}</option>
            <option value="guz">{t(lang, 'login.termGuz')}</option>
            <option value="bahar">{t(lang, 'login.termBahar')}</option>
            <option value="yaz">{t(lang, 'login.termYaz')}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'dash.filterWork')}</label>
          <select
            value={filters.workStatus ?? 'all'}
            onChange={(e) => onChange({ ...filters, workStatus: e.target.value })}
            className="mt-1 w-full min-h-[42px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            <option value="all">{t(lang, 'dash.filterAll')}</option>
            <option value="kamu_kadrolu">{lang === 'en' ? 'Public (Permanent)' : 'Kamu (Kadrolu)'}</option>
            <option value="kamu_sozlesmeli">{lang === 'en' ? 'Public (Contract)' : 'Kamu (Sözleşmeli 4/B)'}</option>
            <option value="ozel_sektor">{lang === 'en' ? 'Private Sector (Paramedic)' : 'Özel Sektör (Paramedik)'}</option>
            <option value="kpss_hazirlik">{lang === 'en' ? 'Preparing for KPSS' : 'KPSS Hazırlık'}</option>
            <option value="dgs_ogrenim">{lang === 'en' ? 'Continuing via DGS' : 'DGS Öğrenim'}</option>
            <option value="is_bulamadim">{lang === 'en' ? 'Looking for work' : 'İş Arayışında'}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
