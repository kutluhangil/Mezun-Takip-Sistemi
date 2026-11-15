export type Lang = 'tr' | 'en'

export interface BilingualText {
  tr: string
  en: string
}

export interface SurveyOption {
  value: string
  tr: string
  en: string
}

export interface MatrixRow {
  id: string
  tr: string
  en: string
}

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'year'
  | 'single'
  | 'multi'
  | 'scale'
  | 'matrix'
  | 'province'
  | 'duration'
  | 'text_or_none'

export interface SurveyQuestion {
  id: string
  section: string
  type: QuestionType
  required: boolean
  label: BilingualText
  hint?: BilingualText
  placeholder?: BilingualText
  noneLabel?: BilingualText
  lockedFromProfile?: 'full_name' | 'email'
  prefillFromProfile?: 'student_number' | 'graduation_year' | 'graduation_term'
  allowOther?: boolean
  maxSelect?: number
  min?: number
  max?: number
  minLabel?: BilingualText
  maxLabel?: BilingualText
  options?: SurveyOption[]
  columns?: SurveyOption[]
  rows?: MatrixRow[]
}

export interface SurveySection {
  id: string
  title: BilingualText
  description: BilingualText
}

export interface SurveyDefinition {
  slug: string
  version: number
  title: BilingualText
  institution: BilingualText
  intro: BilingualText
  sections: SurveySection[]
  questions: SurveyQuestion[]
}

export type AnswerValue =
  | string
  | number
  | { choice: string; otherText?: string }
  | { choices: string[]; otherText?: string }
  | { none: boolean; text?: string }
  | { notWorking: boolean; years?: number; months?: number }
  | Record<string, string>

export type AnswerMap = Record<string, AnswerValue>

export interface GraduateRecord {
  id: string
  email: string
  full_name: string
  student_number: string
  graduation_year: number | null
  graduation_term: 'guz' | 'bahar' | 'yaz' | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: 'owner' | 'viewer'
  active: boolean
}

export interface SurveyRow {
  id: string
  slug: string
  title_tr: string
  title_en: string
  definition: SurveyDefinition
  is_open: boolean
  repeat_mode: 'period' | 'cooldown_days' | 'once'
  active_period: string
  cooldown_days: number
}

export interface SubmittedResponseItem {
  id: string
  survey_id: string
  graduate_id: string
  graduate_email: string
  graduate_name: string
  student_number: string
  graduation_year: number | null
  graduation_term: string | null
  period_key: string
  submission_number: number
  submitted_at: string
  answers: AnswerMap
}
