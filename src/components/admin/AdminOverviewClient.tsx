'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { extractSingleChoice, formatAnswerLabel } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { Art } from '@/components/ui/Art'
import { PageHeader } from '@/components/ui/AppShell'
import { AdminShell } from '@/components/ui/Shells'
import { FilterBar, fmtDateTime, pct, Stat, useSurveyFilters } from './kit'
import { QuestionChartCard } from './QuestionChartCard'

const HIGHLIGHTS = ['q_work_status', 'q_satisfaction', 'q_job_title', 'q_recommend_uni']

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
  const { filters, setFilters, filtered, summary, lang } = useSurveyFilters(survey, responses, totalGraduates)
  const workQ = survey.definition.questions.find((q) => q.id === 'q_work_status')
  const highlights = summary.questions.filter((a) => HIGHLIGHTS.includes(a.question.id))

  return (
    <AdminShell admin={admin}>
      <PageHeader
        kicker={
          <>
            <span className="inline-flex items-center gap-2 text-ink-2">
              {survey.is_open ? <span className="live-dot" /> : <span className="size-2 rounded-full bg-ink-3" />}
              {t(lang, survey.is_open ? 'land.open' : 'land.closed')}
            </span>
            <span>{t(lang, 'survey.periodTag')} <span className="tabular text-ink-2">{survey.active_period}</span></span>
          </>
        }
        title={t(lang, 'dash.title')}
        lede={t(lang, 'dash.subtitle')}
      />

      <div className="mt-8"><FilterBar survey={survey} summary={summary} filters={filters} onChange={setFilters} /></div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label={t(lang, 'dash.kpiResponses')} value={summary.totalResponses}
          sub={t(lang, 'dash.kpiSubWhitelist', { total: summary.totalGraduatesInWhitelist, pct: summary.participationRate })} />
        <Stat label={t(lang, 'dash.kpiEmployed')} value={pct(summary.employmentRate)} accent
          sub={t(lang, 'dash.kpiEmployedSub', { n: summary.inFieldEmployedCount })} />
        <Stat label={t(lang, 'dash.kpiSatisfaction')} value={summary.meanSatisfaction || '—'} sub="0–10" />
        <Stat label={t(lang, 'dash.kpiRecommend')} value={pct(summary.recommendRate)} />
      </div>

      {filtered.length === 0 ? (
        <div className="mx-auto mt-16 max-w-[440px] text-center">
          <Art name="admin" className="mx-auto size-36" />
          <p className="serif mt-5 text-[24px] text-ink">{t(lang, 'dash.emptyTitle')}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{t(lang, 'dash.noResponses')}</p>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {highlights.map((agg) => <QuestionChartCard key={agg.question.id} agg={agg} />)}
          </div>

          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <h2 className="serif text-[26px] text-ink">{t(lang, 'dash.recentTitle')}</h2>
              <Link href="/admin/yanitlar" className="inline-flex items-center gap-1 text-[14px] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {t(lang, 'nav.responses')} <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul className="mt-5 divide-y divide-line-2 border-y border-line-2">
              {filtered.slice(0, 8).map((r) => (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 px-1 py-4 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <span className="text-[13px] tabular text-ink-3">{fmtDateTime(r.submitted_at, lang)}</span>
                  <span className="col-span-2 min-w-0 truncate text-[15px] text-ink sm:col-span-1">
                    {workQ ? formatAnswerLabel(workQ, r.answers.q_work_status, lang) : extractSingleChoice(r.answers.q_work_status)?.choice}
                  </span>
                  <span className="row-start-1 text-right text-[13px] tabular text-ink-3 sm:row-auto">
                    {r.period_key} · {typeof r.answers.q_satisfaction === 'number' ? `${r.answers.q_satisfaction}/10` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AdminShell>
  )
}
