'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileType2, Table2 } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { btn, Card, PageHeader } from '@/components/ui/AppShell'
import { FilterBar, useSurveyFilters } from './kit'

const FORMATS = [
  { id: 'xlsx', icon: FileSpreadsheet, title: 'rep.excelTitle', desc: 'rep.excelDesc', identity: true },
  { id: 'csv', icon: Table2, title: 'rep.csvTitle', desc: 'rep.csvDesc', identity: true },
  { id: 'docx', icon: FileText, title: 'rep.docxTitle', desc: 'rep.docxDesc', identity: false },
  { id: 'pdf', icon: FileType2, title: 'rep.pdfTitle', desc: 'rep.pdfDesc', identity: false },
] as const

export function AdminReportsClient({
  survey,
  responses,
  totalGraduates,
}: {
  survey: SurveyRow
  responses: SubmittedResponseItem[]
  totalGraduates: number
}) {
  const { filters, setFilters, filtered, summary, lang } = useSurveyFilters(survey, responses, totalGraduates)
  const [anonymous, setAnonymous] = useState(true)

  const href = (format: string) => {
    const p = new URLSearchParams({
      format,
      lang,
      period: filters.period ?? 'all',
      year: filters.graduationYear ?? 'all',
      term: filters.graduationTerm ?? 'all',
      workStatus: filters.workStatus ?? 'all',
      anonymous: anonymous ? '1' : '0',
    })
    return `/api/admin/export?${p.toString()}`
  }

  return (
    <>
      <PageHeader kicker={<span className="tabular">{t(lang, 'ana.kicker', { n: filtered.length })}</span>} title={t(lang, 'rep.title')} lede={t(lang, 'rep.subtitle')} />
      <div className="mt-8"><FilterBar survey={survey} summary={summary} filters={filters} onChange={setFilters} /></div>

      <button type="button" role="switch" aria-checked={anonymous} onClick={() => setAnonymous((v) => !v)} className="choice mt-4 items-start sm:max-w-xl">
        <span className="mark mt-0.5 rounded-md">{anonymous && <span className="size-2 rounded-sm bg-white" />}</span>
        <span>
          <span className="block text-[15px] text-ink">{t(lang, 'rep.anonymous')}</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-3">{t(lang, 'rep.anonymousHint')}</span>
        </span>
      </button>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {FORMATS.map((f) => {
          const Icon = f.icon
          return (
            <Card as="li" key={f.id} className="flex flex-col p-6">
              <span className="flex items-center justify-between gap-3">
                <Icon size={22} strokeWidth={1.5} className="text-clay" />
                <span className="font-mono text-[12px] uppercase text-ink-3">.{f.id}</span>
              </span>
              <span className="serif mt-4 block text-[21px] leading-snug text-ink">{t(lang, f.title)}</span>
              <span className="mt-2 block flex-1 text-[14.5px] leading-relaxed text-ink-2">{t(lang, f.desc)}</span>
              {!f.identity && <span className="mt-3 block text-[12.5px] text-ink-3">{t(lang, 'rep.summaryOnly')}</span>}
              <a href={href(f.id)} download className={`${btn.small} mt-5 self-start`}>
                <Download size={15} strokeWidth={1.75} />
                {t(lang, 'rep.download')}
              </a>
            </Card>
          )
        })}
      </ul>
    </>
  )
}
