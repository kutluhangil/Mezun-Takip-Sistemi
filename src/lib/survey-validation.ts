import { SPECIAL_LOCATIONS, TURKISH_PROVINCES } from '../../data/provinces'
import type { AnswerMap, AnswerValue, Lang, SurveyDefinition, SurveyQuestion, SurveyRow } from './survey-types'

export const TEXT_LIMITS = { short: 200, long: 2000 } as const
export const OTHER_CHOICE = '__other__'

const PROVINCE_VALUES = new Set<string>([
  ...TURKISH_PROVINCES,
  SPECIAL_LOCATIONS.abroad.value,
  SPECIAL_LOCATIONS.notWorking.value,
])

function clip(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.replace(/\u0000/g, '').trim()
  return s ? s.slice(0, max) : undefined
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function sanitizeOne(q: SurveyQuestion, raw: unknown): AnswerValue | undefined {
  const allowed = new Set((q.options ?? []).map((o) => o.value))
  if (q.allowOther) allowed.add(OTHER_CHOICE)

  switch (q.type) {
    case 'text':
      return clip(raw, TEXT_LIMITS.short)
    case 'textarea':
      return clip(raw, TEXT_LIMITS.long)
    case 'province': {
      const s = clip(raw, 80)
      return s && PROVINCE_VALUES.has(s) ? s : undefined
    }
    case 'year': {
      const n = Number(raw)
      const max = new Date().getFullYear() + 1
      return Number.isInteger(n) && n >= 1990 && n <= max ? n : undefined
    }
    case 'scale': {
      const n = Number(raw)
      const min = q.min ?? 0
      const max = q.max ?? 10
      return Number.isInteger(n) && n >= min && n <= max ? n : undefined
    }
    case 'single': {
      const choice = typeof raw === 'string' ? raw : isObj(raw) ? raw.choice : undefined
      if (typeof choice !== 'string' || !allowed.has(choice)) return undefined
      if (choice === OTHER_CHOICE) {
        const otherText = clip(isObj(raw) ? raw.otherText : undefined, TEXT_LIMITS.short)
        return otherText ? { choice, otherText } : { choice }
      }
      return { choice }
    }
    case 'multi': {
      if (!isObj(raw) || !Array.isArray(raw.choices)) return undefined
      const choices = [...new Set(raw.choices.filter((c): c is string => typeof c === 'string' && allowed.has(c)))]
      if (choices.length === 0) return undefined
      const limited = q.maxSelect ? choices.slice(0, q.maxSelect) : choices
      const otherText = limited.includes(OTHER_CHOICE) ? clip(raw.otherText, TEXT_LIMITS.short) : undefined
      return otherText ? { choices: limited, otherText } : { choices: limited }
    }
    case 'text_or_none': {
      if (!isObj(raw)) return undefined
      if (raw.none === true) return { none: true }
      const text = clip(raw.text, TEXT_LIMITS.long)
      return text ? { none: false, text } : undefined
    }
    case 'duration': {
      if (!isObj(raw)) return undefined
      if (raw.notWorking === true) return { notWorking: true }
      const years = Number(raw.years ?? 0)
      const months = Number(raw.months ?? 0)
      if (!Number.isInteger(years) || !Number.isInteger(months)) return undefined
      if (years < 0 || years > 60 || months < 0 || months > 11) return undefined
      return { notWorking: false, years, months }
    }
    case 'matrix': {
      if (!isObj(raw)) return undefined
      const cols = new Set((q.columns ?? []).map((c) => c.value))
      const out: Record<string, string> = {}
      for (const row of q.rows ?? []) {
        const v = raw[row.id]
        if (typeof v === 'string' && cols.has(v)) out[row.id] = v
      }
      return Object.keys(out).length > 0 ? out : undefined
    }
  }
}

/**
 * İstemciden gelen cevap haritasını anket tanımına göre temizler: tanımsız soru id'leri,
 * geçersiz seçenekler ve aşırı uzun metinler atılır. Profil kilitli sorular (ad, e-posta) hiç alınmaz;
 * sunucu onları oturumdan yazar.
 */
export function sanitizeAnswers(definition: SurveyDefinition, raw: unknown): AnswerMap {
  const out: AnswerMap = {}
  if (!isObj(raw)) return out
  for (const q of definition.questions) {
    if (q.lockedFromProfile) continue
    if (!(q.id in raw)) continue
    const val = sanitizeOne(q, raw[q.id])
    if (val !== undefined) out[q.id] = val
  }
  return out
}

/** Anket satırından ve son gönderimden uygunluk; tüm rotalar aynı kuralı kullanır. */
export function eligibilityFor(
  survey: Pick<SurveyRow, 'is_open' | 'repeat_mode' | 'active_period' | 'cooldown_days'>,
  latest: { submitted_at: string; period_key: string } | undefined
): EligibilityResult {
  return checkSubmissionEligibility({
    isOpen: survey.is_open,
    repeatMode: survey.repeat_mode,
    activePeriod: survey.active_period,
    cooldownDays: survey.cooldown_days,
    latestSubmittedAt: latest?.submitted_at ?? null,
    latestPeriodKey: latest?.period_key ?? null,
  })
}

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
