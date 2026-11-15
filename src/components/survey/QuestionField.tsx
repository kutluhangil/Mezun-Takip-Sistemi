'use client'

import React from 'react'
import { Check, Lock } from 'lucide-react'
import { SPECIAL_LOCATIONS, TURKISH_PROVINCES } from '../../../data/provinces'
import { t } from '@/lib/i18n'
import type { AnswerValue, Lang, SurveyQuestion } from '@/lib/survey-types'

export function QuestionField({
  question,
  value,
  onChange,
  lang,
  errorMsg,
  indexNumber,
}: {
  question: SurveyQuestion
  value: AnswerValue | undefined
  onChange: (next: AnswerValue) => void
  lang: Lang
  errorMsg?: string
  indexNumber: number
}) {
  const isEn = lang === 'en'
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2018 + 2 }, (_, i) => currentYear + 1 - i)

  const renderControl = () => {
    if (question.lockedFromProfile) {
      return (
        <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl border border-line bg-sunk/70 px-4 py-2.5 text-sm sm:text-base text-ink-2">
          <span className="truncate font-medium text-ink">{typeof value === 'string' ? value : ''}</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-medium text-ink-3 border border-line-2">
            <Lock className="size-3" />
            {t(lang, 'survey.lockedBadge')}
          </span>
        </div>
      )
    }

    if (question.type === 'text') {
      return (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={question.placeholder?.[lang] ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
        />
      )
    }

    if (question.type === 'textarea') {
      return (
        <textarea
          rows={4}
          value={typeof value === 'string' ? value : ''}
          placeholder={question.placeholder?.[lang] ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface p-3.5 text-base leading-relaxed text-ink focus:border-clay focus:outline-none"
        />
      )
    }

    if (question.type === 'year') {
      return (
        <select
          value={value ? String(value) : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full sm:w-64 min-h-[48px] rounded-xl border border-line bg-surface px-4 tabular text-base text-ink focus:border-clay focus:outline-none"
        >
          <option value="">{t(lang, 'survey.selectYear')}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )
    }

    if (question.type === 'province') {
      const strVal = typeof value === 'string' ? value : ''
      return (
        <select
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full sm:w-80 min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
        >
          <option value="">{t(lang, 'survey.selectProvince')}</option>
          <option value={SPECIAL_LOCATIONS.notWorking.value}>
            {SPECIAL_LOCATIONS.notWorking[lang]}
          </option>
          <option value={SPECIAL_LOCATIONS.abroad.value}>
            {SPECIAL_LOCATIONS.abroad[lang]}
          </option>
          {TURKISH_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )
    }

    if (question.type === 'single') {
      const cur =
        typeof value === 'object' && value && 'choice' in value
          ? value
          : typeof value === 'string'
          ? { choice: value, otherText: '' }
          : { choice: '', otherText: '' }

      const opts = question.options ?? []

      return (
        <div className="space-y-2">
          {opts.map((opt) => {
            const active = cur.choice === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ choice: opt.value, otherText: cur.otherText })}
                className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm sm:text-base transition-colors ${
                  active
                    ? 'border-clay bg-band/30 text-ink font-medium'
                    : 'border-line bg-surface text-ink-2 hover:border-ink-3'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    active ? 'border-clay bg-clay text-white' : 'border-ink-3/50 bg-raised'
                  }`}
                >
                  {active && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span className="leading-snug">{opt[lang]}</span>
              </button>
            )
          })}

          {question.allowOther && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onChange({ choice: '__other__', otherText: cur.otherText ?? '' })}
                className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm sm:text-base transition-colors ${
                  cur.choice === '__other__'
                    ? 'border-clay bg-band/30 text-ink font-medium'
                    : 'border-line bg-surface text-ink-2 hover:border-ink-3'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    cur.choice === '__other__' ? 'border-clay bg-clay text-white' : 'border-ink-3/50 bg-raised'
                  }`}
                >
                  {cur.choice === '__other__' && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span>{isEn ? 'Other (please specify)' : 'Diğer (belirtiniz)'}</span>
              </button>

              {cur.choice === '__other__' && (
                <input
                  type="text"
                  value={cur.otherText ?? ''}
                  onChange={(e) => onChange({ choice: '__other__', otherText: e.target.value })}
                  placeholder={t(lang, 'survey.otherPlaceholder')}
                  className="w-full min-h-[46px] rounded-xl border border-clay/60 bg-raised px-4 text-base text-ink focus:border-clay focus:outline-none"
                />
              )}
            </div>
          )}
        </div>
      )
    }

    if (question.type === 'multi') {
      const cur: { choices: string[]; otherText?: string } =
        typeof value === 'object' && value && 'choices' in value && Array.isArray(value.choices)
          ? { choices: value.choices as string[], otherText: value.otherText as string | undefined }
          : { choices: [], otherText: '' }

      const opts = question.options ?? []
      const maxSelect = question.maxSelect

      const toggleChoice = (val: string) => {
        const exists = cur.choices.includes(val)
        if (exists) {
          onChange({
            choices: cur.choices.filter((c) => c !== val),
            otherText: cur.otherText,
          })
          return
        }
        if (maxSelect && cur.choices.length >= maxSelect) {
          return
        }
        onChange({
          choices: [...cur.choices, val],
          otherText: cur.otherText,
        })
      }

      const limitReached = Boolean(maxSelect && cur.choices.length >= maxSelect)

      return (
        <div className="space-y-2">
          {maxSelect && (
            <p className="text-xs font-medium text-clay-ink tabular">
              {t(lang, 'survey.maxSelectWarn', { n: maxSelect })} ({cur.choices.length}/{maxSelect})
            </p>
          )}
          {opts.map((opt) => {
            const active = cur.choices.includes(opt.value)
            const disabled = !active && limitReached
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => toggleChoice(opt.value)}
                className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm sm:text-base transition-colors ${
                  active
                    ? 'border-clay bg-band/30 text-ink font-medium'
                    : disabled
                    ? 'border-line-2 bg-sunk/50 text-ink-3 opacity-60 cursor-not-allowed'
                    : 'border-line bg-surface text-ink-2 hover:border-ink-3'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    active ? 'border-clay bg-clay text-white' : 'border-ink-3/50 bg-raised'
                  }`}
                >
                  {active && <Check className="size-3.5 stroke-[2.5]" />}
                </span>
                <span className="leading-snug">{opt[lang]}</span>
              </button>
            )
          })}

          {question.allowOther && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={!cur.choices.includes('__other__') && limitReached}
                onClick={() => toggleChoice('__other__')}
                className={`flex w-full min-h-[48px] items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm sm:text-base transition-colors ${
                  cur.choices.includes('__other__')
                    ? 'border-clay bg-band/30 text-ink font-medium'
                    : !cur.choices.includes('__other__') && limitReached
                    ? 'border-line-2 bg-sunk/50 text-ink-3 opacity-60 cursor-not-allowed'
                    : 'border-line bg-surface text-ink-2 hover:border-ink-3'
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    cur.choices.includes('__other__')
                      ? 'border-clay bg-clay text-white'
                      : 'border-ink-3/50 bg-raised'
                  }`}
                >
                  {cur.choices.includes('__other__') && <Check className="size-3.5 stroke-[2.5]" />}
                </span>
                <span>{isEn ? 'Other (please specify)' : 'Diğer (belirtiniz)'}</span>
              </button>

              {cur.choices.includes('__other__') && (
                <input
                  type="text"
                  value={cur.otherText ?? ''}
                  onChange={(e) => onChange({ choices: cur.choices, otherText: e.target.value })}
                  placeholder={t(lang, 'survey.otherPlaceholder')}
                  className="w-full min-h-[46px] rounded-xl border border-clay/60 bg-raised px-4 text-base text-ink focus:border-clay focus:outline-none"
                />
              )}
            </div>
          )}
        </div>
      )
    }

    if (question.type === 'text_or_none') {
      const cur =
        typeof value === 'object' && value && 'none' in value
          ? value
          : { none: false, text: '' }

      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onChange({ none: !cur.none, text: cur.text })}
            className={`inline-flex min-h-[46px] items-center gap-2.5 rounded-xl border px-4 text-sm font-medium transition-colors ${
              cur.none
                ? 'border-clay bg-band/35 text-ink'
                : 'border-line bg-surface text-ink-2 hover:border-ink-3'
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-md border ${
                cur.none ? 'border-clay bg-clay text-white' : 'border-ink-3/50 bg-raised'
              }`}
            >
              {cur.none && <Check className="size-3.5 stroke-[2.5]" />}
            </span>
            <span>{question.noneLabel?.[lang] ?? (isEn ? 'None' : 'Yok')}</span>
          </button>

          {!cur.none && (
            <textarea
              rows={3}
              value={cur.text ?? ''}
              placeholder={question.placeholder?.[lang] ?? ''}
              onChange={(e) => onChange({ none: false, text: e.target.value })}
              className="w-full rounded-xl border border-line bg-surface p-3.5 text-base text-ink focus:border-clay focus:outline-none"
            />
          )}
        </div>
      )
    }

    if (question.type === 'duration') {
      const cur: { notWorking: boolean; years?: number; months?: number } =
        typeof value === 'object' && value && 'notWorking' in value
          ? {
              notWorking: Boolean(value.notWorking),
              years: typeof value.years === 'number' ? value.years : Number(value.years ?? 0),
              months: typeof value.months === 'number' ? value.months : Number(value.months ?? 0),
            }
          : { notWorking: false, years: 0, months: 0 }

      return (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() =>
              onChange(
                cur.notWorking
                  ? { notWorking: false, years: cur.years ?? 0, months: cur.months ?? 0 }
                  : { notWorking: true, years: 0, months: 0 }
              )
            }
            className={`inline-flex min-h-[46px] items-center gap-2.5 rounded-xl border px-4 text-sm font-medium transition-colors ${
              cur.notWorking
                ? 'border-clay bg-band/35 text-ink'
                : 'border-line bg-surface text-ink-2 hover:border-ink-3'
            }`}
          >
            <span
              className={`flex size-5 items-center justify-center rounded-md border ${
                cur.notWorking ? 'border-clay bg-clay text-white' : 'border-ink-3/50 bg-raised'
              }`}
            >
              {cur.notWorking && <Check className="size-3.5 stroke-[2.5]" />}
            </span>
            <span>{t(lang, 'survey.notWorkingOption')}</span>
          </button>

          {!cur.notWorking && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <div>
                <label className="block text-xs font-medium text-ink-3">{t(lang, 'survey.years')}</label>
                <select
                  value={cur.years ?? 0}
                  onChange={(e) =>
                    onChange({ notWorking: false, years: Number(e.target.value), months: cur.months ?? 0 })
                  }
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-line bg-surface px-3 tabular text-base text-ink focus:border-clay focus:outline-none"
                >
                  {Array.from({ length: 26 }, (_, n) => (
                    <option key={n} value={n}>
                      {n} {t(lang, 'survey.years')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-3">{t(lang, 'survey.months')}</label>
                <select
                  value={cur.months ?? 0}
                  onChange={(e) =>
                    onChange({ notWorking: false, years: cur.years ?? 0, months: Number(e.target.value) })
                  }
                  className="mt-1 w-full min-h-[48px] rounded-xl border border-line bg-surface px-3 tabular text-base text-ink focus:border-clay focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, n) => (
                    <option key={n} value={n}>
                      {n} {t(lang, 'survey.months')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (question.type === 'scale') {
      const min = question.min ?? 0
      const max = question.max ?? 10
      const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      const picked = typeof value === 'number' ? value : value !== undefined ? Number(value) : null

      return (
        <div className="space-y-2.5">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
            {scores.map((score) => {
              const active = picked === score
              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => onChange(score)}
                  className={`min-h-[46px] rounded-xl border font-mono text-base font-semibold tabular transition-colors ${
                    active
                      ? 'border-clay bg-clay text-white shadow-xs'
                      : 'border-line bg-surface text-ink hover:border-ink-3'
                  }`}
                >
                  {score}
                </button>
              )
            })}
          </div>
          {(question.minLabel || question.maxLabel) && (
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>{question.minLabel?.[lang]}</span>
              <span>{question.maxLabel?.[lang]}</span>
            </div>
          )}
        </div>
      )
    }

    if (question.type === 'matrix') {
      const cols = question.columns ?? []
      const rows = question.rows ?? []
      const cur =
        typeof value === 'object' && value && !Array.isArray(value)
          ? (value as Record<string, string>)
          : {}

      const pickCell = (rowId: string, colVal: string) => {
        onChange({ ...cur, [rowId]: colVal })
      }

      return (
        <div>
          {/* Masaüstü tablo görünümü */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-line-2 bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-sunk/60">
                  <th className="p-3 text-left font-medium text-ink-2 min-w-[260px]">
                    {isEn ? 'Statement' : 'İfade'}
                  </th>
                  {cols.map((c) => (
                    <th key={c.value} className="p-3 text-center text-xs font-medium text-ink-2 min-w-[92px]">
                      {c[lang]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line-2/70 last:border-b-0">
                    <td className="p-3.5 text-sm leading-snug text-ink">{row[lang]}</td>
                    {cols.map((col) => {
                      const active = cur[row.id] === col.value
                      return (
                        <td key={col.value} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => pickCell(row.id, col.value)}
                            aria-label={`${row[lang]}: ${col[lang]}`}
                            className={`mx-auto flex size-9 items-center justify-center rounded-full border transition-colors ${
                              active
                                ? 'border-clay bg-clay text-white'
                                : 'border-line bg-raised hover:border-ink-3'
                            }`}
                          >
                            {active && <span className="size-2.5 rounded-full bg-white" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil (375px+) kart görünümü: yatay taşma yok, kolay dokunma */}
          <div className="space-y-3 md:hidden">
            {rows.map((row, idx) => (
              <div key={row.id} className="rounded-2xl border border-line-2 bg-surface p-4 space-y-2.5">
                <p className="text-sm font-medium leading-snug text-ink">
                  <span className="mr-1.5 text-xs tabular text-clay-ink">{idx + 1}.</span>
                  {row[lang]}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {cols.map((col) => {
                    const active = cur[row.id] === col.value
                    return (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => pickCell(row.id, col.value)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl border px-3.5 text-left text-xs font-medium transition-colors ${
                          active
                            ? 'border-clay bg-band/35 text-ink'
                            : 'border-line bg-raised text-ink-2'
                        }`}
                      >
                        <span>{col[lang]}</span>
                        <span className="font-mono text-[11px] tabular text-ink-3">{col.value}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div
      id={`q-${question.id}`}
      className={`rounded-2xl border p-4 sm:p-6 transition-colors ${
        errorMsg
          ? 'border-danger bg-danger/[0.04]'
          : 'border-line-2 bg-raised/80'
      }`}
    >
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <label className="text-base sm:text-[17px] font-medium leading-snug text-ink">
            <span className="mr-2 font-mono text-xs tabular text-clay-ink">{indexNumber}.</span>
            {question.label[lang]}
            {question.required && !question.lockedFromProfile && (
              <span className="ml-1 text-clay" aria-hidden="true">
                *
              </span>
            )}
          </label>
        </div>
        {question.hint && <p className="mt-1 text-xs sm:text-sm text-ink-3">{question.hint[lang]}</p>}
      </div>

      {renderControl()}

      {errorMsg && (
        <p role="alert" className="mt-2.5 text-xs sm:text-sm font-medium text-danger">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
