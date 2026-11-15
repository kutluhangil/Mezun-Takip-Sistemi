'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Download, Users } from 'lucide-react'
import { aggregateSurvey, filterResponses, formatAnswerLabel, type FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { AdminShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { AdminFilterBar } from './AdminFilterBar'
import { QuestionChartCard } from './QuestionChartCard'

export function AdminOverviewClient({
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

  const workAgg = summary.questions.find((q) => q.question.id === 'q_work_status')
  const satAgg = summary.questions.find((q) => q.question.id === 'q_satisfaction')
  const qWork = survey.definition.questions.find((q) => q.id === 'q_work_status')

  return (
    <AdminShell adminName={admin.full_name} adminRole={admin.role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-ink">
              {survey.active_period} · {survey.is_open ? (lang === 'en' ? 'Active' : 'Anket Açık') : lang === 'en' ? 'Closed' : 'Kapalı'}
            </p>
            <h1 className="serif mt-1 text-3xl sm:text-4xl font-normal text-ink">{t(lang, 'dash.title')}</h1>
            <p className="mt-1 text-sm text-ink-2">{t(lang, 'dash.subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/analiz"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-raised px-4 text-xs sm:text-sm font-medium text-ink hover:border-ink-3"
            >
              <BarChart3 className="size-4 text-clay" />
              {t(lang, 'nav.analytics')}
            </Link>
            <Link
              href="/admin/rapor"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-xs sm:text-sm font-medium text-bg hover:opacity-90"
            >
              <Download className="size-4" />
              {t(lang, 'nav.reports')}
            </Link>
          </div>
        </div>

        <AdminFilterBar
          filters={filters}
          onChange={setFilters}
          periods={summary.periods}
          graduationYears={summary.graduationYears}
        />

        {/* KPI Şeridi */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-line-2 bg-raised/90 p-4 sm:p-5">
            <p className="text-xs font-medium text-ink-3">{t(lang, 'dash.kpiResponses')}</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tabular text-ink">
              {summary.totalResponses}
            </p>
          </div>

          <div className="rounded-2xl border border-line-2 bg-raised/90 p-4 sm:p-5">
            <p className="text-xs font-medium text-ink-3">{t(lang, 'dash.kpiGraduates')}</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tabular text-ink">
              {summary.uniqueGraduatesResponded}
            </p>
            {totalGraduates > 0 && (
              <p className="mt-1 text-xs tabular text-ink-3">
                {t(lang, 'dash.kpiSubWhitelist', {
                  pct: summary.participationRate,
                  total: totalGraduates,
                })}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-line-2 bg-raised/90 p-4 sm:p-5">
            <p className="text-xs font-medium text-ink-3">{t(lang, 'dash.kpiEmployed')}</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tabular text-clay-ink">
              %{summary.employmentRate}
            </p>
            <p className="mt-1 text-xs tabular text-ink-3">
              {summary.inFieldEmployedCount} {lang === 'en' ? 'in-field' : 'alan içi'}
            </p>
          </div>

          <div className="rounded-2xl border border-line-2 bg-raised/90 p-4 sm:p-5">
            <p className="text-xs font-medium text-ink-3">{t(lang, 'dash.kpiSatisfaction')}</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tabular text-ink">
              {summary.meanSatisfaction}
            </p>
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-2xl border border-line-2 bg-raised/90 p-4 sm:p-5">
            <p className="text-xs font-medium text-ink-3">{t(lang, 'dash.kpiRecommend')}</p>
            <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tabular text-sage">
              %{summary.recommendRate}
            </p>
          </div>
        </div>

        {/* Öne çıkan iki grafik */}
        <div className="grid gap-4 lg:grid-cols-2">
          {workAgg && <QuestionChartCard agg={workAgg} />}
          {satAgg && <QuestionChartCard agg={satAgg} />}
        </div>

        {/* Son gönderilen yanıtlar */}
        <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="serif text-2xl font-normal text-ink">{t(lang, 'dash.recentTitle')}</h2>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/mezunlar"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink"
              >
                <Users className="size-3.5" />
                {t(lang, 'nav.graduates')}
              </Link>
              <Link
                href="/admin/yanitlar"
                className="inline-flex items-center gap-1 text-xs font-medium text-clay-ink hover:underline"
              >
                {lang === 'en' ? 'View all' : 'Tümünü gör'}
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-ink-3">{t(lang, 'dash.noResponses')}</p>
          ) : (
            <div className="mt-4 divide-y divide-line-2">
              {filtered.slice(0, 8).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <span className="font-medium text-ink">{r.graduate_name}</span>
                    <span className="ml-2 text-xs font-mono tabular text-ink-3">
                      {r.student_number || r.graduate_email} · {r.graduation_year ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-2">
                    <span className="rounded-full border border-line bg-surface px-2.5 py-0.5">
                      {qWork ? formatAnswerLabel(qWork, r.answers.q_work_status, lang) : '—'}
                    </span>
                    <span className="font-mono tabular text-ink-3">
                      {new Date(r.submitted_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'tr-TR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
