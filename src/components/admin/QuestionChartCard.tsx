'use client'

import React from 'react'
import type { QuestionAggregation } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import { useUI } from '@/components/ui/UIProvider'

const LIKERT_COLORS = ['#C45D47', '#E09278', '#A3A29B', '#6D9886', '#4A7C6F']

export function QuestionChartCard({ agg }: { agg: QuestionAggregation }) {
  const { lang } = useUI()

  if (agg.kind === 'categorical') {
    const maxCount = Math.max(1, ...agg.options.map((o) => o.count), ...agg.otherGroups.map((g) => g.count))
    return (
      <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-medium text-ink">{agg.question.label[lang]}</h3>
          <span className="rounded-full border border-line bg-sunk px-2.5 py-0.5 text-xs tabular text-ink-2">
            {agg.answered} {t(lang, 'ana.answered')}
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {agg.options.map((opt) => {
            const widthPct = maxCount > 0 ? Math.max(opt.count > 0 ? 3 : 0, (opt.count / maxCount) * 100) : 0
            return (
              <div key={opt.value} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
                  <span className="text-ink-2 leading-snug">{opt.label}</span>
                  <span className="shrink-0 font-mono text-xs tabular text-ink">
                    {opt.count} <span className="text-ink-3">(%{opt.pct})</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-sunk">
                  <div
                    className="h-full rounded-full bg-clay transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {agg.otherGroups.length > 0 && (
          <div className="mt-5 border-t border-line-2 pt-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              {t(lang, 'ana.otherGrouped')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {agg.otherGroups.map((g) => (
                <span
                  key={g.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2"
                >
                  <span>{g.label}</span>
                  <strong className="font-mono tabular text-clay-ink">×{g.count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (agg.kind === 'scale') {
    const maxBucket = Math.max(1, ...agg.scale.buckets.map((b) => b.count))
    return (
      <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-medium text-ink">{agg.question.label[lang]}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs tabular">
            <span className="rounded-full bg-band/40 px-2.5 py-0.5 font-semibold text-clay-ink">
              {t(lang, 'ana.mean')}: {agg.scale.mean} / 10
            </span>
            <span className="rounded-full border border-line bg-sunk px-2.5 py-0.5 text-ink-2">
              {t(lang, 'ana.median')}: {agg.scale.median}
            </span>
          </div>
        </div>

        <div className="mt-5 grid h-36 grid-cols-11 items-end gap-1.5 sm:gap-2">
          {agg.scale.buckets.map((b) => {
            const hPct = b.count > 0 ? Math.max(12, Math.round((b.count / maxBucket) * 100)) : 0
            return (
              <div key={b.score} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="font-mono text-[11px] tabular text-ink-2">
                  {b.count > 0 ? b.count : ''}
                </span>
                <div className="flex h-24 w-full items-end rounded-md bg-sunk/80 p-0.5">
                  {b.count > 0 && (
                    <div
                      className="w-full rounded-sm bg-clay transition-all"
                      style={{ height: `${hPct}%` }}
                    />
                  )}
                </div>
                <span className="font-mono text-xs tabular text-ink-3">{b.score}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (agg.kind === 'matrix') {
    return (
      <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base sm:text-lg font-medium text-ink">{agg.question.label[lang]}</h3>
          <span className="rounded-full border border-line bg-sunk px-2.5 py-0.5 text-xs tabular text-ink-2">
            {agg.answered} {t(lang, 'ana.answered')}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-2">
          {agg.columns.map((c, idx) => (
            <span key={c.value} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-xs"
                style={{ background: LIKERT_COLORS[idx % LIKERT_COLORS.length] }}
              />
              {c.label}
            </span>
          ))}
        </div>

        <div className="mt-4 space-y-3.5">
          {agg.rows.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
                <span className="text-ink-2 leading-snug">{r.label}</span>
                <span className="shrink-0 font-mono text-xs tabular font-semibold text-ink">
                  {r.mean.toFixed(2)} / 5
                </span>
              </div>
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-sunk">
                {agg.columns.map((c, idx) => {
                  const pct = r.pcts[c.value] ?? 0
                  if (pct <= 0) return null
                  return (
                    <div
                      key={c.value}
                      title={`${c.label}: ${r.counts[c.value] ?? 0} (%${pct})`}
                      style={{
                        width: `${pct}%`,
                        background: LIKERT_COLORS[idx % LIKERT_COLORS.length],
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (agg.kind === 'duration') {
    return (
      <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium text-ink">{agg.question.label[lang]}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line-2 bg-surface p-3">
            <p className="text-xs text-ink-3">{lang === 'en' ? 'Mean (months)' : 'Ortalama (ay)'}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular text-ink">{agg.duration.meanMonths}</p>
          </div>
          <div className="rounded-xl border border-line-2 bg-surface p-3">
            <p className="text-xs text-ink-3">{lang === 'en' ? 'Median (months)' : 'Ortanca (ay)'}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular text-ink">{agg.duration.medianMonths}</p>
          </div>
          <div className="rounded-xl border border-line-2 bg-surface p-3">
            <p className="text-xs text-ink-3">{lang === 'en' ? 'Working' : 'Çalışan'}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular text-sage">{agg.duration.workingCount}</p>
          </div>
          <div className="rounded-xl border border-line-2 bg-surface p-3">
            <p className="text-xs text-ink-3">{lang === 'en' ? 'Not working' : 'Çalışmıyor'}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular text-ink-2">{agg.duration.notWorkingCount}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base sm:text-lg font-medium text-ink">{agg.question.label[lang]}</h3>
        <span className="rounded-full border border-line bg-sunk px-2.5 py-0.5 text-xs tabular text-ink-2">
          {agg.text.entries.length} {lang === 'en' ? 'entries' : 'giriş'} · {agg.text.noneCount}{' '}
          {lang === 'en' ? 'None' : 'Yok'}
        </span>
      </div>
      {agg.text.entries.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">{lang === 'en' ? 'No written responses yet.' : 'Henüz yazılı yanıt yok.'}</p>
      ) : (
        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {agg.text.entries.map((e, i) => (
            <div key={i} className="rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-sm">
              <span className="font-medium text-ink">
                {e.graduateName} <span className="text-xs tabular text-ink-3">({e.graduationYear ?? '—'})</span>:
              </span>{' '}
              <span className="text-ink-2">{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
