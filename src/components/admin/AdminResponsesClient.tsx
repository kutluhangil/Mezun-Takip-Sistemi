'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { aggregateSurvey, filterResponses, formatAnswerLabel, type FilterCriteria } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from '@/lib/survey-types'
import { AdminShell } from '@/components/ui/Shells'
import { Art } from '@/components/ui/Art'
import { useUI } from '@/components/ui/UIProvider'
import { AdminFilterBar } from './AdminFilterBar'

export function AdminResponsesClient({
  admin,
  survey,
  responses,
}: {
  admin: AdminUser
  survey: SurveyRow
  responses: SubmittedResponseItem[]
}) {
  const { lang } = useUI()
  const [filters, setFilters] = useState<FilterCriteria>({
    period: 'all',
    graduationYear: 'all',
    graduationTerm: 'all',
    workStatus: 'all',
  })
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const summary = useMemo(
    () =>
      aggregateSurvey({
        definition: survey.definition,
        responses,
        totalGraduatesInWhitelist: 0,
        lang,
      }),
    [survey.definition, responses, lang]
  )

  const filtered = useMemo(() => {
    const f = filterResponses(responses, filters)
    const q = search.trim().toLowerCase()
    if (!q) return f
    return f.filter(
      (r) =>
        r.graduate_name.toLowerCase().includes(q) ||
        r.graduate_email.toLowerCase().includes(q) ||
        r.student_number.toLowerCase().includes(q)
    )
  }, [responses, filters, search])

  const questions = survey.definition.questions.filter((q) => !q.lockedFromProfile)

  return (
    <AdminShell adminName={admin.full_name} adminRole={admin.role}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="serif text-3xl sm:text-4xl font-normal text-ink">{t(lang, 'nav.responses')}</h1>
            <p className="mt-1 text-sm text-ink-2 tabular">
              {filtered.length} {t(lang, 'ana.answered')} ·{' '}
              {lang === 'en' ? 'Submissions are immutable (append-only)' : 'Gönderilen yanıtlar silinmez (salt okunur)'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search name, student #, email…' : 'Ad, öğrenci no, e-posta ara…'}
              className="w-full min-h-[42px] rounded-full border border-line bg-raised pl-10 pr-4 text-sm text-ink focus:border-clay focus:outline-none"
            />
          </div>
        </div>

        <AdminFilterBar
          filters={filters}
          onChange={setFilters}
          periods={summary.periods}
          graduationYears={summary.graduationYears}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-line-2 bg-raised/90 p-8 text-center text-sm text-ink-3">
            <Art name="empty" size={140} />
            {t(lang, 'dash.noResponses')}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const isOpen = openId === r.id
              return (
                <div key={r.id} className="rounded-2xl border border-line-2 bg-raised/90 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-surface/80 transition-colors"
                  >
                    <div>
                      <p className="text-base font-medium text-ink">
                        {r.graduate_name}
                        <span className="ml-2 font-mono text-xs tabular text-clay-ink">
                          #{r.submission_number} · {r.period_key}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-3 tabular">
                        {r.student_number || '—'} · {r.graduate_email} · {r.graduation_year ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-3 tabular">
                      <span>{new Date(r.submitted_at).toLocaleString(lang === 'en' ? 'en-US' : 'tr-TR')}</span>
                      <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-line-2 bg-surface/60 p-4 sm:p-5 space-y-3">
                      {questions.map((q) => (
                        <div key={q.id} className="rounded-xl border border-line-2 bg-raised p-3.5 text-sm">
                          <p className="text-xs font-medium text-ink-3">{q.label[lang]}</p>
                          <p className="mt-1 whitespace-pre-wrap text-ink leading-relaxed">
                            {formatAnswerLabel(q, r.answers[q.id], lang)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
