'use client'

import React, { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, TableProperties, FileCode } from 'lucide-react'
import { aggregateSurvey, filterResponses, type FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { AdminShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { AdminFilterBar } from './AdminFilterBar'

export function AdminReportsClient({
  admin,
  survey,
  responses,
  totalGraduates,
}: {
  admin: AdminUser
  survey: SurveyRow
  responses: SubmittedResponseItem[]
  totalGraduates: number
}) {
  const { lang } = useUI()
  const [filters, setFilters] = useState<FilterCriteria>({
    period: 'all',
    graduationYear: 'all',
    graduationTerm: 'all',
    workStatus: 'all',
  })

  const filtered = useMemo(() => filterResponses(responses, filters), [responses, filters])
  const summary = useMemo(
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

  const buildDownloadUrl = (format: 'xlsx' | 'csv' | 'docx' | 'pdf') => {
    const sp = new URLSearchParams({
      format,
      lang,
      period: filters.period || 'all',
      year: filters.graduationYear || 'all',
      term: filters.graduationTerm || 'all',
      workStatus: filters.workStatus || 'all',
    })
    return `/api/admin/export?${sp.toString()}`
  }

  const cards = [
    {
      fmt: 'xlsx' as const,
      title: t(lang, 'rep.excelTitle'),
      desc: t(lang, 'rep.excelDesc'),
      icon: <FileSpreadsheet className="size-6 text-sage" />,
    },
    {
      fmt: 'csv' as const,
      title: t(lang, 'rep.csvTitle'),
      desc: t(lang, 'rep.csvDesc'),
      icon: <TableProperties className="size-6 text-ink-2" />,
    },
    {
      fmt: 'docx' as const,
      title: t(lang, 'rep.docxTitle'),
      desc: t(lang, 'rep.docxDesc'),
      icon: <FileText className="size-6 text-clay" />,
    },
    {
      fmt: 'pdf' as const,
      title: t(lang, 'rep.pdfTitle'),
      desc: t(lang, 'rep.pdfDesc'),
      icon: <FileCode className="size-6 text-clay-ink" />,
    },
  ]

  return (
    <AdminShell adminName={admin.full_name} adminRole={admin.role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div>
          <h1 className="serif text-3xl sm:text-4xl font-normal text-ink">{t(lang, 'rep.title')}</h1>
          <p className="mt-1 text-sm text-ink-2">{t(lang, 'rep.subtitle')}</p>
        </div>

        <AdminFilterBar
          filters={filters}
          onChange={setFilters}
          periods={summary.periods}
          graduationYears={summary.graduationYears}
        />

        <div className="rounded-2xl border border-line-2 bg-surface px-4 py-3 text-xs sm:text-sm text-ink-2 tabular">
          {lang === 'en' ? 'Selected dataset:' : 'Dışa aktarılacak kayıt:'}{' '}
          <strong className="text-ink">{filtered.length}</strong> {t(lang, 'ana.answered')} ·{' '}
          <strong className="text-clay-ink">{lang.toUpperCase()}</strong>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((c) => (
            <div
              key={c.fmt}
              className="flex flex-col justify-between rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6"
            >
              <div>
                <div className="inline-flex size-11 items-center justify-center rounded-xl border border-line-2 bg-surface">
                  {c.icon}
                </div>
                <h2 className="serif mt-4 text-2xl font-normal text-ink">{c.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.desc}</p>
              </div>

              <div className="mt-6">
                <a
                  href={buildDownloadUrl(c.fmt)}
                  className="enter-btn inline-flex min-h-[44px] items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-bg hover:opacity-95"
                >
                  {t(lang, 'rep.download')} ({c.fmt.toUpperCase()})
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
