'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { formatAnswerLabel } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { Art } from '@/components/ui/Art'
import { PageHeader } from '@/components/ui/AppShell'
import { AdminShell } from '@/components/ui/Shells'
import { FilterBar, fmtDateTime, useSurveyFilters } from './kit'

const PAGE = 30

export function AdminResponsesClient({ admin, survey, responses }: { admin: AdminUser; survey: SurveyRow; responses: SubmittedResponseItem[] }) {
  const { filters, setFilters, filtered, summary, lang } = useSurveyFilters(survey, responses, 0)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const workQ = survey.definition.questions.find((x) => x.id === 'q_work_status')
  const questions = survey.definition.questions

  const rows = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr')
    if (!s) return filtered
    return filtered.filter((r) =>
      [r.graduate_name, r.graduate_email, r.student_number].some((v) => v?.toLocaleLowerCase('tr').includes(s))
    )
  }, [filtered, q])

  return (
    <AdminShell admin={admin}>
      <PageHeader kicker={<span className="tabular">{t(lang, 'ana.kicker', { n: rows.length })}</span>} title={t(lang, 'resp.title')} lede={t(lang, 'resp.lede')} />

      <div className="mt-8 grid gap-3">
        <label className="relative block">
          <Search size={17} strokeWidth={1.75} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <input type="search" className="field !pl-11" placeholder={t(lang, 'resp.search')} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} />
        </label>
        <FilterBar survey={survey} summary={summary} filters={filters} onChange={(f) => { setFilters(f); setLimit(PAGE) }} />
      </div>

      {rows.length === 0 ? (
        <div className="mx-auto mt-16 max-w-[420px] text-center">
          <Art name="empty" className="mx-auto size-32" />
          <p className="mt-4 text-[15px] text-ink-2">{t(lang, 'dash.noResponses')}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.slice(0, limit).map((r) => (
            <li key={r.id}>
              <details className="group rounded-2xl border border-line-2 bg-raised/60 backdrop-blur-sm open:bg-raised">
                <summary className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] sm:p-5">
                  <span className="min-w-0">
                    <span className="serif block truncate text-[18px] text-ink">{r.graduate_name}</span>
                    <span className="block truncate text-[13px] text-ink-3">{r.graduate_email}</span>
                  </span>
                  <span className="col-span-2 row-start-2 truncate text-[14px] text-ink-2 sm:col-span-1 sm:row-auto">
                    {workQ ? formatAnswerLabel(workQ, r.answers.q_work_status, lang) : ''}
                  </span>
                  <span className="text-right text-[12.5px] tabular text-ink-3">
                    <span className="block">{r.period_key}</span>
                    <span className="block">{fmtDateTime(r.submitted_at, lang)}</span>
                  </span>
                  <ChevronDown size={18} className="chev hidden text-ink-3 transition-transform sm:block" />
                </summary>
                <dl className="divide-y divide-line-2 border-t border-line-2 px-4 sm:px-5">
                  {questions.map((qq, i) => (
                    <div key={qq.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-6">
                      <dt className="text-[13.5px] leading-snug text-ink-3"><span className="mr-1.5 font-mono tabular">{i + 1}.</span>{qq.label[lang]}</dt>
                      <dd className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{formatAnswerLabel(qq, r.answers[qq.id], lang) || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
      {rows.length > limit && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="inline-flex h-11 items-center rounded-full border border-line bg-raised/60 px-5 text-[14.5px] text-ink hover:border-ink-3">
            {t(lang, 'resp.more', { n: rows.length - limit })}
          </button>
        </div>
      )}
    </AdminShell>
  )
}
