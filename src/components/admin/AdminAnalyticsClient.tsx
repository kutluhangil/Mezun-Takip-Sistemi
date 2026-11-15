'use client'

import React, { useMemo, useState } from 'react'
import { aggregateSurvey, filterResponses, type FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { AdminShell } from '@/components/ui/Shells'
import { Art } from '@/components/ui/Art'
import { useUI } from '@/components/ui/UIProvider'
import { AdminFilterBar } from './AdminFilterBar'
import { CrossTabPanel } from './CrossTabPanel'
import { QuestionChartCard } from './QuestionChartCard'

export function AdminAnalyticsClient({
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

  return (
    <AdminShell adminName={admin.full_name} adminRole={admin.role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="serif text-3xl sm:text-4xl font-normal text-ink">{t(lang, 'ana.title')}</h1>
            <p className="mt-1 text-sm text-ink-2 tabular">
              {filtered.length} / {responses.length} {t(lang, 'ana.answered')}
            </p>
          </div>
          <Art name="admin" size={96} className="hidden md:inline-flex" />
        </div>

        <AdminFilterBar
          filters={filters}
          onChange={setFilters}
          periods={summary.periods}
          graduationYears={summary.graduationYears}
        />

        <CrossTabPanel definition={survey.definition} responses={filtered} />

        <div className="space-y-4">
          {summary.questions.map((agg) => (
            <QuestionChartCard key={agg.question.id} agg={agg} />
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
