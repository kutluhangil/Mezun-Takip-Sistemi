'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Send } from 'lucide-react'
import { t } from '@/lib/i18n'
import { isQuestionAnswered, validateSurveyAnswers, type EligibilityResult } from '@/lib/survey-validation'
import type { AnswerMap, AnswerValue, GraduateRecord, SurveyRow } from '@/lib/survey-types'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { QuestionField } from './QuestionField'

export interface HistoryItem {
  id: string
  period_key: string
  submission_number: number
  submitted_at: string
}

function buildInitialAnswers(
  graduate: GraduateRecord,
  survey: SurveyRow,
  draftAnswers: AnswerMap | null
): AnswerMap {
  const base: AnswerMap = { ...(draftAnswers ?? {}) }
  base.q_full_name = graduate.full_name
  base.q_email = graduate.email
  if (!base.q_student_number && graduate.student_number) {
    base.q_student_number = graduate.student_number
  }
  if (!base.q_grad_year && graduate.graduation_year) {
    base.q_grad_year = graduate.graduation_year
  }
  if (!base.q_grad_term && graduate.graduation_term) {
    base.q_grad_term = { choice: graduate.graduation_term }
  }
  void survey
  return base
}

export function SurveyClient({
  graduate,
  survey,
  eligibility,
  history,
  draftAnswers,
}: {
  graduate: GraduateRecord
  survey: SurveyRow
  eligibility: EligibilityResult
  history: HistoryItem[]
  draftAnswers: AnswerMap | null
}) {
  const { lang } = useUI()
  const router = useRouter()
  const sections = survey.definition.sections
  const questions = survey.definition.questions

  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerMap>(() =>
    buildInitialAnswers(graduate, survey, draftAnswers)
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorsByQ, setErrorsByQ] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitBanner, setSubmitBanner] = useState<string | null>(null)
  const [shake, setShake] = useState(false)

  const dirtyRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const questionNumbers = useMemo(() => {
    const map: Record<string, number> = {}
    questions.forEach((q, idx) => {
      map[q.id] = idx + 1
    })
    return map
  }, [questions])

  const persistDraft = async (payload: AnswerMap) => {
    setSaveState('saving')
    try {
      const res = await fetch('/api/survey/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }

  useEffect(() => {
    if (!eligibility.allowed || !dirtyRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void persistDraft(answers)
    }, 750)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [answers, eligibility.allowed])

  const handleChange = (qId: string, val: AnswerValue) => {
    dirtyRef.current = true
    setAnswers((prev) => ({ ...prev, [qId]: val }))
    if (errorsByQ[qId]) {
      setErrorsByQ((prev) => {
        const next = { ...prev }
        delete next[qId]
        return next
      })
    }
  }

  const currentSection = sections[stepIdx]
  const currentQuestions = questions.filter((q) => q.section === currentSection?.id)

  const validateSection = (secId: string): boolean => {
    const missing: Record<string, string> = {}
    for (const q of questions.filter((item) => item.section === secId)) {
      if (q.required && !isQuestionAnswered(q, answers[q.id])) {
        missing[q.id] =
          lang === 'en' ? 'This question requires an answer.' : 'Bu soru zorunludur.'
      }
    }
    if (Object.keys(missing).length > 0) {
      setErrorsByQ((prev) => ({ ...prev, ...missing }))
      setShake(false)
      requestAnimationFrame(() => setShake(true))
      const firstId = Object.keys(missing)[0]
      document.getElementById(`q-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!currentSection) return
    if (!validateSection(currentSection.id)) return
    setStepIdx((i) => Math.min(sections.length - 1, i + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrev = () => {
    setStepIdx((i) => Math.max(0, i - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSubmitBanner(null)
    const allErrs = validateSurveyAnswers(survey.definition, answers, lang)
    if (allErrs.length > 0) {
      const errMap: Record<string, string> = {}
      for (const e of allErrs) errMap[e.questionId] = e.message
      setErrorsByQ(errMap)

      const firstSecIdx = sections.findIndex((s) => s.id === allErrs[0].section)
      if (firstSecIdx >= 0) setStepIdx(firstSecIdx)
      setSubmitBanner(
        lang === 'en'
          ? `Please complete ${allErrs.length} required field(s) highlighted below.`
          : `Lütfen işaretlenen ${allErrs.length} zorunlu soruyu tamamlayın.`
      )
      setTimeout(() => {
        document
          .getElementById(`q-${allErrs[0].questionId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, lang }),
      })
      const data = (await res.json()) as {
        error?: string
        errors?: { questionId: string; message: string }[]
        redirectTo?: string
      }
      if (!res.ok) {
        if (data.errors?.length) {
          const m: Record<string, string> = {}
          for (const e of data.errors) m[e.questionId] = e.message
          setErrorsByQ(m)
        }
        setSubmitBanner(data.error || 'Anket gönderilemedi.')
        return
      }
      router.push(data.redirectTo || '/tesekkurler')
      router.refresh()
    } catch {
      setSubmitBanner('Gönderim sırasında bağlantı hatası oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!eligibility.allowed) {
    return (
      <PublicShell graduateEmail={graduate.email}>
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <div className="enter rounded-3xl border border-line-2 bg-raised/90 p-6 sm:p-8 shadow-[var(--shadow)]">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-sage/15 text-sage">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="serif mt-4 text-3xl text-ink">{t(lang, 'survey.alreadyDoneTitle')}</h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-2">
              {eligibility.reason === 'survey_closed'
                ? lang === 'en'
                  ? 'The survey is currently closed for new submissions.'
                  : 'Anket şu anda yeni yanıtlara kapalıdır.'
                : t(lang, 'survey.alreadyDoneBody')}
            </p>
            {eligibility.nextAvailableAt && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-sunk px-3.5 py-1.5 text-xs font-medium text-ink-2 tabular">
                <Clock className="size-3.5 text-clay" />
                {new Date(eligibility.nextAvailableAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'tr-TR')}
              </p>
            )}

            {history.length > 0 && (
              <div className="mt-6 border-t border-line-2 pt-5">
                <h2 className="text-sm font-semibold text-ink">{t(lang, 'survey.historyTitle')}</h2>
                <ul className="mt-3 space-y-2">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium text-ink tabular">
                        #{h.submission_number} · {h.period_key}
                      </span>
                      <span className="text-xs text-ink-3 tabular">
                        {new Date(h.submitted_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'tr-TR')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink hover:border-ink-3"
              >
                {t(lang, 'thanks.backHome')}
              </Link>
            </div>
          </div>
        </div>
      </PublicShell>
    )
  }

  const pct = Math.round(((stepIdx + 1) / sections.length) * 100)

  return (
    <PublicShell hideMobileNav graduateEmail={graduate.email}>
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
        {/* Üst ilerleme ve dönem şeridi */}
        <div className="rounded-2xl border border-line-2 bg-raised/85 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
              <span className="live-dot" />
              <span className="tabular">
                {t(lang, 'survey.periodTag')} {survey.active_period}
              </span>
              <span className="text-line">|</span>
              <span className="tabular text-clay-ink">
                {t(lang, 'survey.stepOf', { current: stepIdx + 1, total: sections.length })}
              </span>
            </div>

            <div className="text-xs font-medium text-ink-3">
              {saveState === 'saving' && <span>{t(lang, 'survey.saving')}</span>}
              {saveState === 'saved' && (
                <span className="inline-flex items-center gap-1 text-sage">
                  <Check className="size-3.5" />
                  {t(lang, 'survey.saved')}
                </span>
              )}
              {saveState === 'error' && <span className="text-danger">{t(lang, 'survey.saveError')}</span>}
            </div>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sunk">
            <div
              className="h-full rounded-full bg-clay transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            {sections.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (idx <= stepIdx || validateSection(sections[stepIdx].id)) {
                    setStepIdx(idx)
                  }
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  idx === stepIdx
                    ? 'bg-ink text-bg'
                    : idx < stepIdx
                    ? 'bg-band/40 text-ink'
                    : 'bg-sunk text-ink-3'
                }`}
              >
                {idx + 1}. {s.title[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Bölüm başlığı */}
        {currentSection && (
          <div className={`mt-6 ${shake ? 'shake' : ''}`}>
            <h1 className="serif text-2xl sm:text-3xl font-normal text-ink">
              {currentSection.title[lang]}
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-ink-2">
              {currentSection.description[lang]}
            </p>
          </div>
        )}

        {submitBanner && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
          >
            {submitBanner}
          </div>
        )}

        {/* Bölüm soruları */}
        <div className="mt-5 space-y-4">
          {currentQuestions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              onChange={(val) => handleChange(q.id, val)}
              lang={lang}
              errorMsg={errorsByQ[q.id]}
              indexNumber={questionNumbers[q.id]}
            />
          ))}
        </div>
      </div>

      {/* Sabit başparmak dostu alt kontrol çubuğu */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-2 bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={handlePrev}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-line bg-raised px-5 text-sm font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            <span>{t(lang, 'survey.prev')}</span>
          </button>

          {stepIdx < sections.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="enter-btn inline-flex min-h-[48px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm sm:text-base font-medium text-bg"
            >
              <span>{t(lang, 'survey.next')}</span>
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="enter-btn inline-flex min-h-[48px] flex-1 sm:flex-none items-center justify-center gap-2 rounded-full bg-clay px-7 text-sm sm:text-base font-semibold text-white disabled:opacity-60"
            >
              <Send className="size-4" />
              <span>{submitting ? t(lang, 'survey.submitting') : t(lang, 'survey.submit')}</span>
            </button>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
