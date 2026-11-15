import type { AnswerMap, AnswerValue, Lang, SurveyDefinition, SurveyQuestion } from './survey-types'

export interface EligibilityResult {
  allowed: boolean
  reason?: 'survey_closed' | 'already_submitted_period' | 'cooldown_active' | 'already_submitted_once'
  nextAvailableAt?: string
}

export function checkSubmissionEligibility(params: {
  isOpen: boolean
  repeatMode: 'period' | 'cooldown_days' | 'once'
  activePeriod: string
  cooldownDays: number
  latestSubmittedAt: string | null
  latestPeriodKey: string | null
  now?: Date
}): EligibilityResult {
  if (!params.isOpen) {
    return { allowed: false, reason: 'survey_closed' }
  }
  if (!params.latestSubmittedAt) {
    return { allowed: true }
  }

  if (params.repeatMode === 'once') {
    return { allowed: false, reason: 'already_submitted_once' }
  }

  if (params.repeatMode === 'period') {
    if (params.latestPeriodKey === params.activePeriod) {
      return { allowed: false, reason: 'already_submitted_period' }
    }
    return { allowed: true }
  }

  const last = new Date(params.latestSubmittedAt)
  const now = params.now ?? new Date()
  const unlock = new Date(last.getTime() + params.cooldownDays * 24 * 60 * 60 * 1000)
  if (now < unlock) {
    return { allowed: false, reason: 'cooldown_active', nextAvailableAt: unlock.toISOString() }
  }
  return { allowed: true }
}

export interface ValidationErrorItem {
  questionId: string
  section: string
  message: string
}

function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

export function isQuestionAnswered(q: SurveyQuestion, val: AnswerValue | undefined): boolean {
  if (val === undefined || val === null) return false

  switch (q.type) {
    case 'text':
    case 'textarea':
    case 'province':
      return hasText(val)
    case 'year':
      return typeof val === 'number' || hasText(val)
    case 'scale': {
      const n = typeof val === 'number' ? val : Number(val)
      const min = q.min ?? 0
      const max = q.max ?? 10
      return Number.isFinite(n) && n >= min && n <= max
    }
    case 'single': {
      if (typeof val === 'string') return hasText(val) && val !== '__other__'
      if (typeof val === 'object' && 'choice' in val) {
        if (!hasText(val.choice)) return false
        if (val.choice === '__other__') return hasText(val.otherText)
        return true
      }
      return false
    }
    case 'multi': {
      if (typeof val !== 'object' || !('choices' in val) || !Array.isArray(val.choices)) return false
      if (val.choices.length === 0) return false
      if (q.maxSelect && val.choices.length > q.maxSelect) return false
      if (val.choices.includes('__other__') && !hasText(val.otherText)) return false
      return true
    }
    case 'text_or_none': {
      if (typeof val !== 'object' || !('none' in val)) return false
      if (val.none) return true
      return hasText(val.text)
    }
    case 'duration': {
      if (typeof val !== 'object' || !('notWorking' in val)) return false
      if (val.notWorking) return true
      const y = Number(val.years ?? 0)
      const m = Number(val.months ?? 0)
      return Number.isFinite(y) && Number.isFinite(m) && y >= 0 && m >= 0 && m <= 11 && (y > 0 || m > 0)
    }
    case 'matrix': {
      if (typeof val !== 'object' || Array.isArray(val)) return false
      const rec = val as Record<string, string>
      const rows = q.rows ?? []
      return rows.every((r) => hasText(rec[r.id]))
    }
  }
}

export function validateSurveyAnswers(
  definition: SurveyDefinition,
  answers: AnswerMap,
  lang: Lang
): ValidationErrorItem[] {
  const errors: ValidationErrorItem[] = []
  for (const q of definition.questions) {
    const val = answers[q.id]
    if (q.type === 'multi' && val && typeof val === 'object' && 'choices' in val && Array.isArray(val.choices)) {
      if (q.maxSelect && val.choices.length > q.maxSelect) {
        errors.push({
          questionId: q.id,
          section: q.section,
          message:
            lang === 'en'
              ? `Please select at most ${q.maxSelect} options.`
              : `En fazla ${q.maxSelect} seçenek işaretleyebilirsiniz.`,
        })
        continue
      }
    }

    if (q.required && !isQuestionAnswered(q, val)) {
      errors.push({
        questionId: q.id,
        section: q.section,
        message:
          lang === 'en'
            ? `Please complete "${q.label.en}".`
            : `"${q.label.tr}" sorusunu yanıtlayınız.`,
      })
    }
  }
  return errors
}
