'use client'

import React from 'react'
import { Check, Lock } from 'lucide-react'
import { SPECIAL_LOCATIONS, TURKISH_PROVINCES } from '../../../data/provinces'
import { t } from '@/lib/i18n'
import { OTHER_CHOICE, TEXT_LIMITS } from '@/lib/survey-validation'
import type { AnswerValue, Lang, SurveyQuestion } from '@/lib/survey-types'

type Single = { choice: string; otherText?: string }
type Multi = { choices: string[]; otherText?: string }
type TextOrNone = { none: boolean; text?: string }
type Duration = { notWorking: boolean; years?: number; months?: number }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function Mark({ on, square }: { on: boolean; square?: boolean }) {
  return (
    <span className={`mark ${square ? 'rounded-md' : 'rounded-full'}`}>
      {on && (square ? <Check className="size-3.5" strokeWidth={2.6} /> : <span className="size-2 rounded-full bg-white" />)}
    </span>
  )
}

function OtherInput({ value, onChange, lang }: { value?: string; onChange: (v: string) => void; lang: Lang }) {
  return (
    <input autoFocus className="field mt-2" maxLength={TEXT_LIMITS.short} placeholder={t(lang, 'survey.otherPlaceholder')}
      value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  )
}

export function QuestionField({
  question: q,
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
  const fieldId = `f-${q.id}`
  const labelId = `l-${q.id}`
  const invalid = Boolean(errorMsg) || undefined

  const control = (): React.ReactNode => {
    if (q.lockedFromProfile) {
      return (
        <div className="flex min-h-12 items-center justify-between gap-3 rounded-[14px] border border-line-2 bg-sunk/70 px-4">
          <span className="truncate text-[15.5px] text-ink">{typeof value === 'string' ? value : ''}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-ink-3">
            <Lock className="size-3.5" />
            {t(lang, 'survey.lockedBadge')}
          </span>
        </div>
      )
    }

    switch (q.type) {
      case 'text':
        return <input id={fieldId} className="field" aria-invalid={invalid} maxLength={TEXT_LIMITS.short}
          inputMode={q.id === 'q_student_number' ? 'numeric' : undefined} placeholder={q.placeholder?.[lang]}
          value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />

      case 'textarea':
        return (
          <div>
            <textarea id={fieldId} className="field" rows={4} aria-invalid={invalid} maxLength={TEXT_LIMITS.long}
              placeholder={q.placeholder?.[lang]} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
            <p className="mt-1.5 text-right text-[12px] tabular text-ink-3">{(typeof value === 'string' ? value.length : 0)} / {TEXT_LIMITS.long}</p>
          </div>
        )

      case 'year': {
        const now = new Date().getFullYear()
        const years = Array.from({ length: now + 2 - 2018 }, (_, i) => now + 1 - i)
        return (
          <select id={fieldId} className="field tabular sm:max-w-xs" aria-invalid={invalid}
            value={typeof value === 'number' ? value : ''} onChange={(e) => onChange(Number(e.target.value))}>
            <option value="" disabled>{t(lang, 'survey.selectYear')}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )
      }

      case 'province':
        return (
          <select id={fieldId} className="field sm:max-w-md" aria-invalid={invalid}
            value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
            <option value="" disabled>{t(lang, 'survey.selectProvince')}</option>
            <option value={SPECIAL_LOCATIONS.notWorking.value}>{SPECIAL_LOCATIONS.notWorking[lang]}</option>
            <option value={SPECIAL_LOCATIONS.abroad.value}>{SPECIAL_LOCATIONS.abroad[lang]}</option>
            <optgroup label={lang === 'en' ? 'Provinces' : 'İller'}>
              {TURKISH_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </optgroup>
          </select>
        )

      case 'single': {
        const cur: Single = isObj(value) && typeof (value as Record<string, unknown>).choice === 'string' ? (value as Single) : { choice: typeof value === 'string' ? value : '' }
        return (
          <div role="radiogroup" aria-labelledby={labelId} className="grid gap-2">
            {(q.options ?? []).map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={cur.choice === o.value} className="choice"
                onClick={() => onChange({ choice: o.value })}>
                <Mark on={cur.choice === o.value} />
                <span>{o[lang]}</span>
              </button>
            ))}
            {q.allowOther && (
              <div>
                <button type="button" role="radio" aria-checked={cur.choice === OTHER_CHOICE} className="choice"
                  onClick={() => onChange({ choice: OTHER_CHOICE, otherText: cur.otherText ?? '' })}>
                  <Mark on={cur.choice === OTHER_CHOICE} />
                  <span>{t(lang, 'survey.other')}</span>
                </button>
                {cur.choice === OTHER_CHOICE && (
                  <OtherInput lang={lang} value={cur.otherText} onChange={(v) => onChange({ choice: OTHER_CHOICE, otherText: v })} />
                )}
              </div>
            )}
          </div>
        )
      }

      case 'multi': {
        const cur: Multi = isObj(value) && Array.isArray((value as Record<string, unknown>).choices) ? (value as Multi) : { choices: [] }
        const full = Boolean(q.maxSelect && cur.choices.length >= q.maxSelect)
        const toggle = (v: string) => {
          const has = cur.choices.includes(v)
          if (!has && full) return
          const choices = has ? cur.choices.filter((c) => c !== v) : [...cur.choices, v]
          onChange({ choices, otherText: choices.includes(OTHER_CHOICE) ? cur.otherText : undefined })
        }
        const opts = [...(q.options ?? []), ...(q.allowOther ? [{ value: OTHER_CHOICE, tr: t('tr', 'survey.other'), en: t('en', 'survey.other') }] : [])]
        return (
          <div>
            {q.maxSelect && (
              <p className={`mb-2.5 text-[13px] tabular ${full ? 'text-clay-ink' : 'text-ink-3'}`}>
                {t(lang, 'survey.maxSelectWarn', { n: q.maxSelect })} · {cur.choices.length}/{q.maxSelect}
              </p>
            )}
            <div role="group" aria-labelledby={labelId} className="grid gap-2">
              {opts.map((o) => {
                const on = cur.choices.includes(o.value)
                return (
                  <button key={o.value} type="button" role="checkbox" aria-checked={on} disabled={!on && full}
                    className="choice" onClick={() => toggle(o.value)}>
                    <Mark on={on} square />
                    <span>{o[lang]}</span>
                  </button>
                )
              })}
            </div>
            {cur.choices.includes(OTHER_CHOICE) && (
              <OtherInput lang={lang} value={cur.otherText} onChange={(v) => onChange({ choices: cur.choices, otherText: v })} />
            )}
          </div>
        )
      }

      case 'text_or_none': {
        const cur: TextOrNone = isObj(value) && 'none' in value ? (value as TextOrNone) : { none: false, text: '' }
        return (
          <div className="grid gap-2">
            <button type="button" role="checkbox" aria-checked={cur.none} className="choice"
              onClick={() => onChange(cur.none ? { none: false, text: '' } : { none: true })}>
              <Mark on={cur.none} square />
              <span>{q.noneLabel?.[lang] ?? t(lang, 'survey.none')}</span>
            </button>
            {!cur.none && (
              <textarea id={fieldId} className="field" rows={3} aria-invalid={invalid} maxLength={TEXT_LIMITS.long}
                placeholder={q.placeholder?.[lang]} value={cur.text ?? ''} onChange={(e) => onChange({ none: false, text: e.target.value })} />
            )}
          </div>
        )
      }

      case 'duration': {
        const cur: Duration = isObj(value) && 'notWorking' in value ? (value as Duration) : { notWorking: false, years: 0, months: 0 }
        const set = (patch: Partial<Duration>) => onChange({ notWorking: false, years: cur.years ?? 0, months: cur.months ?? 0, ...patch })
        return (
          <div className="grid gap-3">
            <button type="button" role="checkbox" aria-checked={cur.notWorking} className="choice sm:max-w-md"
              onClick={() => onChange(cur.notWorking ? { notWorking: false, years: 0, months: 0 } : { notWorking: true })}>
              <Mark on={cur.notWorking} square />
              <span>{t(lang, 'survey.notWorkingOption')}</span>
            </button>
            {!cur.notWorking && (
              <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                <Stepper label={t(lang, 'survey.years')} value={cur.years ?? 0} max={45} onChange={(years) => set({ years })} />
                <Stepper label={t(lang, 'survey.months')} value={cur.months ?? 0} max={11} onChange={(months) => set({ months })} />
              </div>
            )}
          </div>
        )
      }

      case 'scale': {
        const min = q.min ?? 0
        const max = q.max ?? 10
        const picked = typeof value === 'number' ? value : null
        return (
          <div>
            <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={picked === n} onClick={() => onChange(n)}
                  className={`h-12 rounded-xl border font-mono text-[16px] tabular transition-colors ${
                    picked === n ? 'border-clay bg-clay text-white' : 'border-line bg-raised/70 text-ink hover:border-ink-3'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            {(q.minLabel || q.maxLabel) && (
              <div className="mt-2 flex justify-between gap-4 text-[12.5px] text-ink-3">
                <span>{min} · {q.minLabel?.[lang]}</span>
                <span className="text-right">{max} · {q.maxLabel?.[lang]}</span>
              </div>
            )}
          </div>
        )
      }

      case 'matrix': {
        const cols = q.columns ?? []
        const cur: Record<string, string> = isObj(value) ? (value as Record<string, string>) : {}
        const answered = (q.rows ?? []).filter((r) => cur[r.id]).length
        return (
          <div>
            <p className="mb-3 text-[13px] tabular text-ink-3">{t(lang, 'survey.matrixProgress', { done: answered, total: q.rows?.length ?? 0 })}</p>
            <ol className="grid gap-3">
              {(q.rows ?? []).map((row, i) => (
                <li key={row.id} className={`rounded-2xl border p-4 transition-colors ${cur[row.id] ? 'border-line-2 bg-raised/50' : 'border-line bg-raised/70'}`}>
                  <p id={`${q.id}-${row.id}`} className="text-[15px] leading-snug text-ink">
                    <span className="mr-2 tabular text-ink-3">{i + 1}.</span>{row[lang]}
                  </p>
                  <div role="radiogroup" aria-labelledby={`${q.id}-${row.id}`} className="mt-3 grid grid-cols-5 gap-1.5">
                    {cols.map((c) => {
                      const on = cur[row.id] === c.value
                      return (
                        <button key={c.value} type="button" role="radio" aria-checked={on} title={c[lang]}
                          onClick={() => onChange({ ...cur, [row.id]: c.value })}
                          className={`flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition-colors ${
                            on ? 'border-clay bg-clay text-white' : 'border-line bg-raised/70 text-ink-2 hover:border-ink-3'
                          }`}>
                          <span className="font-mono text-[15px] tabular">{c.value}</span>
                          <span className={`hidden text-[11px] leading-tight sm:block ${on ? 'text-white/90' : 'text-ink-3'}`}>{c[lang]}</span>
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3 sm:hidden">
              {cols.map((c) => <span key={c.value}><span className="font-mono">{c.value}</span> = {c[lang]}</span>)}
            </p>
          </div>
        )
      }
    }
  }

  return (
    <fieldset id={`q-${q.id}`} className="scroll-mt-28">
      <legend id={labelId} className="mb-3.5 flex gap-3">
        <span className="mt-[3px] shrink-0 font-mono text-[13px] tabular text-ink-3">{String(indexNumber).padStart(2, '0')}</span>
        <span>
          <span className="block text-[17.5px] leading-[1.45] text-ink sm:text-[18.5px]">
            {q.label[lang]}
            {q.required && !q.lockedFromProfile && <span className="ml-1 text-clay" aria-hidden>*</span>}
          </span>
          {q.hint && <span className="mt-1 block text-[14px] leading-relaxed text-ink-3">{q.hint[lang]}</span>}
        </span>
      </legend>
      <div className="sm:pl-8">{control()}</div>
      {errorMsg && <p role="alert" className="mt-2 text-[13.5px] text-danger sm:pl-8">{errorMsg}</p>}
    </fieldset>
  )
}

function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  const b = 'grid size-12 place-items-center rounded-xl border border-line bg-raised/70 text-[20px] text-ink transition-colors hover:border-ink-3 disabled:opacity-40'
  return (
    <div>
      <span className="mb-1.5 block text-[13px] text-ink-3">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={b} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label={`${label} −`}>−</button>
        <span className="min-w-10 flex-1 text-center font-mono text-[20px] tabular text-ink" aria-live="polite">{value}</span>
        <button type="button" className={b} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} +`}>+</button>
      </div>
    </div>
  )
}
