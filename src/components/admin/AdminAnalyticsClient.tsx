'use client'

import { useMemo, useState } from 'react'
import { t } from '@/lib/i18n'
import type { SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { PageHeader } from '@/components/ui/AppShell'
import { CrossTabPanel } from './CrossTabPanel'
import { FilterBar, useSurveyFilters } from './kit'
import { QuestionChartCard } from './QuestionChartCard'

export function AdminAnalyticsClient({
  survey,
  responses,
  totalGraduates,
}: {
  survey: SurveyRow
  responses: SubmittedResponseItem[]
  totalGraduates: number
}) {
  const { filters, setFilters, filtered, summary, lang } = useSurveyFilters(survey, responses, totalGraduates)
  const [sectionId, setSectionId] = useState<string>('all')
  const sections = survey.definition.sections
  const shown = useMemo(
    () => summary.questions.filter((a) => !a.question.lockedFromProfile && (sectionId === 'all' || a.question.section === sectionId)),
    [summary.questions, sectionId]
  )

  return (
    <>
      <PageHeader kicker={<span className="tabular">{t(lang, 'ana.kicker', { n: filtered.length })}</span>} title={t(lang, 'ana.title')} lede={t(lang, 'ana.lede')} />
      <div className="mt-8"><FilterBar survey={survey} summary={summary} filters={filters} onChange={setFilters} /></div>

      <div className="scroll-thin -mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2" role="tablist">
          {[{ id: 'all', label: t(lang, 'dash.filterAll') }, ...sections.map((s) => ({ id: s.id, label: s.title[lang].replace(/^\d+\.\s*/, '') }))].map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={sectionId === s.id} onClick={() => setSectionId(s.id)}
              className={`h-10 whitespace-nowrap rounded-full border px-4 text-[14px] transition-colors ${
                sectionId === s.id ? 'border-ink bg-ink text-bg' : 'border-line bg-raised/60 text-ink-2 hover:border-ink-3'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {shown.map((agg) => (
          <div key={agg.question.id} className={agg.kind === 'matrix' || agg.kind === 'text' ? 'lg:col-span-2' : ''}>
            <QuestionChartCard agg={agg} />
          </div>
        ))}
      </div>

      <div className="mt-12"><CrossTabPanel definition={survey.definition} responses={filtered} /></div>
    </>
  )
}
