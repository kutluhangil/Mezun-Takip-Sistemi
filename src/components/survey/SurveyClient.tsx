'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Send } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { KvkkNoticeSetting, SubmissionHistoryItem } from '@/lib/server-data'
import { isQuestionAnswered, validateSurveyAnswers, type EligibilityResult } from '@/lib/survey-validation'
import type { AnswerMap, AnswerValue, GraduateRecord, Lang, SurveyRow } from '@/lib/survey-types'
import { Art } from '@/components/ui/Art'
import { btn, Notice } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { QuestionField } from './QuestionField'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function initialAnswers(graduate: GraduateRecord, draft: AnswerMap | null): AnswerMap {
  const a: AnswerMap = { ...(draft ?? {}) }
  a.q_full_name = graduate.full_name
  a.q_email = graduate.email
  if (!a.q_student_number && graduate.student_number) a.q_student_number = graduate.student_number
  if (!a.q_grad_year && graduate.graduation_year) a.q_grad_year = graduate.graduation_year
  if (!a.q_grad_term && graduate.graduation_term) a.q_grad_term = { choice: graduate.graduation_term }
  return a
}

const sectionTitle = (s: string) => s.replace(/^\d+\.\s*/, '')
const fmtDate = (iso: string, lang: Lang) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

export function SurveyClient({
  graduate,
  survey,
  eligibility,
  history,
  draftAnswers,
  kvkk,
}: {
  graduate: GraduateRecord
  survey: SurveyRow
  eligibility: EligibilityResult
  history: SubmissionHistoryItem[]
  draftAnswers: AnswerMap | null
  kvkk: KvkkNoticeSetting | null
}) {
  const { lang } = useUI()
  const [needsConsent, setNeedsConsent] = useState(Boolean(kvkk))

  if (!eligibility.allowed) return <NotEligible eligibility={eligibility} history={history} lang={lang} />
  if (needsConsent && kvkk) return <ConsentGate kvkk={kvkk} lang={lang} onDone={() => setNeedsConsent(false)} />
  return <SurveyForm graduate={graduate} survey={survey} draftAnswers={draftAnswers} lang={lang} />
}

function SurveyForm({ graduate, survey, draftAnswers, lang }: { graduate: GraduateRecord; survey: SurveyRow; draftAnswers: AnswerMap | null; lang: Lang }) {
  const router = useRouter()
  const { sections, questions } = survey.definition
  const [answers, setAnswers] = useState<AnswerMap>(() => initialAnswers(graduate, draftAnswers))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [banner, setBanner] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [submitting, setSubmitting] = useState(false)
  const dirty = useRef(false)
  const latest = useRef(answers)
  useEffect(() => {
    latest.current = answers
  }, [answers])

  const numbers = useMemo(() => Object.fromEntries(questions.map((q, i) => [q.id, i + 1])), [questions])
  const missingIn = useCallback(
    (secId: string, a: AnswerMap) => questions.filter((q) => q.section === secId && q.required && !isQuestionAnswered(q, a[q.id])),
    [questions]
  )
  // Yarım bırakılan ankette ilk eksik bölümden devam
  const [step, setStep] = useState(() => {
    const idx = sections.findIndex((s) => missingIn(s.id, answers).length > 0)
    return idx === -1 ? sections.length - 1 : idx
  })
  const section = sections[step]
  const isLast = step === sections.length - 1

  const save = useCallback(async (payload: AnswerMap, keepalive = false) => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/survey/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
        keepalive,
      })
      setSaveState(res.ok ? 'saved' : 'error')
      if (res.ok) dirty.current = false
    } catch {
      setSaveState('error')
    }
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    const id = setTimeout(() => void save(answers), 800)
    return () => clearTimeout(id)
  }, [answers, save])

  // Sekme kapanırken / arka plana geçerken bekleyen taslağı gönder (telefonda sık olur)
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && dirty.current) void save(latest.current, true)
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [save])

  const change = (id: string, v: AnswerValue) => {
    dirty.current = true
    setAnswers((a) => ({ ...a, [id]: v }))
    if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest)
  }

  const focusFirst = (id: string) =>
    setTimeout(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)

  const go = (to: number) => {
    setBanner(null)
    setStep(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const missing = missingIn(section.id, answers)
    if (missing.length > 0) {
      setErrors((e) => ({ ...e, ...Object.fromEntries(missing.map((q) => [q.id, t(lang, 'survey.required')])) }))
      setBanner(t(lang, 'survey.missingInSection', { n: missing.length }))
      return focusFirst(missing[0].id)
    }
    go(step + 1)
  }

  const submit = async () => {
    const all = validateSurveyAnswers(survey.definition, answers, lang)
    if (all.length > 0) {
      setErrors(Object.fromEntries(all.map((e) => [e.questionId, e.message])))
      setStep(sections.findIndex((s) => s.id === all[0].section))
      setBanner(t(lang, 'survey.missingTotal', { n: all.length }))
      return focusFirst(all[0].questionId)
    }
    setSubmitting(true)
    setBanner(null)
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(data.redirectTo || '/tesekkurler')
        router.refresh()
        return
      }
      if (res.status === 409 || res.status === 403) {
        router.refresh()
        return
      }
      if (data.errors?.length) setErrors(Object.fromEntries(data.errors.map((e: { questionId: string; message: string }) => [e.questionId, e.message])))
      setBanner(t(lang, 'survey.submitError'))
    } catch {
      setBanner(t(lang, 'error.network'))
    } finally {
      setSubmitting(false)
    }
  }

  const sectionQs = questions.filter((q) => q.section === section.id)
  const answeredCount = questions.filter((q) => isQuestionAnswered(q, answers[q.id])).length
  const pct = Math.round((answeredCount / questions.length) * 100)

  return (
    <PublicShell signedIn focus>
      {/* İlerleme şeridi */}
      <div className="sticky top-[calc(64px+env(safe-area-inset-top))] z-30 border-b border-line-2 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] items-center gap-4 px-4 py-2.5 sm:px-6">
          <ol className="flex flex-1 gap-1.5" aria-label={t(lang, 'survey.stepOf', { current: step + 1, total: sections.length })}>
            {sections.map((s, i) => (
              <li key={s.id} className="flex-1">
                <button type="button" onClick={() => i < step && go(i)} disabled={i >= step} aria-current={i === step ? 'step' : undefined}
                  aria-label={sectionTitle(s.title[lang])}
                  className={`block h-1.5 w-full rounded-full transition-colors ${i < step ? 'bg-clay' : i === step ? 'bg-ink' : 'bg-line'}`} />
              </li>
            ))}
          </ol>
          <span className="shrink-0 text-[12.5px] tabular text-ink-3">%{pct}</span>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-4 sm:px-6">
        <header key={section.id} className="reveal pt-8 sm:pt-12">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-3">
            <span>{t(lang, 'survey.stepOf', { current: step + 1, total: sections.length })}</span>
            <span>{t(lang, 'survey.periodTag')} <span className="tabular text-ink-2">{survey.active_period}</span></span>
          </p>
          <h1 className="serif mt-3 text-[32px] leading-[1.1] text-ink sm:text-[42px]">{sectionTitle(section.title[lang])}</h1>
          {section.description[lang] && <p className="mt-3 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">{section.description[lang]}</p>}
        </header>

        {banner && <div className="mt-6"><Notice tone="warn">{banner}</Notice></div>}

        <div key={`q-${section.id}`} className="enter mt-10 space-y-11">
          {sectionQs.map((q) => (
            <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={(v) => change(q.id, v)}
              lang={lang} errorMsg={errors[q.id]} indexNumber={numbers[q.id]} />
          ))}
        </div>
      </div>

      {/* Başparmak çubuğu */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => go(step - 1)} disabled={step === 0}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-raised/70 text-ink transition-colors hover:border-ink-3 disabled:opacity-35"
            aria-label={t(lang, 'survey.prev')}>
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <SaveIndicator state={saveState} lang={lang} />
          {isLast ? (
            <button type="button" onClick={() => void submit()} disabled={submitting} className={`${btn.primary} ml-auto min-w-[150px]`}>
              {submitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} strokeWidth={1.75} />}
              {t(lang, submitting ? 'survey.submitting' : 'survey.submit')}
            </button>
          ) : (
            <button type="button" onClick={next} className={`${btn.primary} ml-auto min-w-[150px]`}>
              {t(lang, 'survey.next')}
              <ArrowRight size={17} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </PublicShell>
  )
}

function SaveIndicator({ state, lang }: { state: SaveState; lang: Lang }) {
  if (state === 'idle') return <span className="text-[12.5px] text-ink-3">{t(lang, 'survey.autosave')}</span>
  const map = {
    saving: { icon: <Loader2 size={13} className="animate-spin" />, key: 'survey.saving', cls: 'text-ink-3' },
    saved: { icon: <Check size={13} />, key: 'survey.saved', cls: 'text-ink-3' },
    error: { icon: <CloudOff size={13} />, key: 'survey.saveError', cls: 'text-danger' },
  } as const
  const m = map[state]
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 truncate text-[12.5px] ${m.cls}`} role="status">
      {m.icon}
      <span className="truncate">{t(lang, m.key)}</span>
    </span>
  )
}

function ConsentGate({ kvkk, lang, onDone }: { kvkk: KvkkNoticeSetting; lang: Lang; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accept = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/survey/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true }),
      })
      if (res.ok) onDone()
      else setError(t(lang, 'error.body'))
    } catch {
      setError(t(lang, 'error.network'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <PublicShell signedIn>
      <div className="reveal mx-auto max-w-[640px] px-4 pt-10 sm:px-6 sm:pt-14">
        <Art name="privacy" className="mx-auto size-28" />
        <h1 className="serif mt-6 text-center text-[32px] leading-tight text-ink sm:text-[40px]">{t(lang, 'consent.title')}</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-center text-[15.5px] leading-relaxed text-ink-2">{t(lang, 'consent.body')}</p>
        <div className="scroll-thin mt-8 max-h-[50vh] overflow-y-auto whitespace-pre-line rounded-2xl border border-line-2 bg-raised/60 p-5 text-[14px] leading-relaxed text-ink-2">
          {kvkk[lang] || kvkk.tr}
        </div>
        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        <button type="button" onClick={() => void accept()} disabled={busy} className={`${btn.primary} mt-6 w-full`}>
          {t(lang, 'consent.accept')}
        </button>
      </div>
    </PublicShell>
  )
}

function NotEligible({ eligibility, history, lang }: { eligibility: EligibilityResult; history: SubmissionHistoryItem[]; lang: Lang }) {
  const closed = eligibility.reason === 'survey_closed'
  return (
    <PublicShell signedIn>
      <div className="reveal mx-auto max-w-[620px] px-4 pt-10 text-center sm:px-6 sm:pt-14">
        <Art name={closed ? 'empty' : 'waiting'} className="mx-auto size-40" />
        <h1 className="serif mt-6 text-[32px] leading-tight text-ink sm:text-[42px]">{t(lang, closed ? 'survey.closedTitle' : 'survey.alreadyDoneTitle')}</h1>
        <p className="mx-auto mt-4 max-w-[50ch] text-[16px] leading-relaxed text-ink-2">
          {t(lang, closed ? 'survey.closedBody' : 'survey.alreadyDoneBody')}
        </p>
        {eligibility.nextAvailableAt && (
          <p className="mt-3 text-[14.5px] text-ink-2">
            {t(lang, 'survey.nextAvailable')} <span className="font-medium text-ink">{fmtDate(eligibility.nextAvailableAt, lang)}</span>
          </p>
        )}
        {history.length > 0 && (
          <div className="mt-10 text-left">
            <h2 className="text-[13.5px] text-ink-3">{t(lang, 'survey.historyTitle')}</h2>
            <ul className="mt-3 divide-y divide-line-2 border-y border-line-2">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 py-3.5 text-[15px]">
                  <span className="text-ink">{h.period_key}</span>
                  <span className="tabular text-ink-3">{fmtDate(h.submitted_at, lang)} · #{h.submission_number}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className={`${btn.secondary} mt-10`}>{t(lang, 'thanks.backHome')}</Link>
      </div>
    </PublicShell>
  )
}
