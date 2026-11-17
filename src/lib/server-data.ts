import fs from 'fs'
import path from 'path'
import { query } from './db'
import type {
  AdminUser,
  AnswerMap,
  AnswerValue,
  GraduateRecord,
  SubmittedResponseItem,
  SurveyDefinition,
  SurveyRow,
} from './survey-types'
import fallbackSurveyJson from '../../data/surveys/mezun-bilgi-2026.json'
import kvkkDraftJson from '../../data/kvkk-aydinlatma-taslak.json'

const kvkkDraft: KvkkNoticeSetting = kvkkDraftJson

export interface KvkkNoticeSetting {
  version: string
  tr: string
  en: string
}

export interface WhitelistSetting {
  enabled: boolean
  note?: string
}

export interface AppSettingsBundle {
  whitelistRequired: WhitelistSetting
  kvkkNotice: KvkkNoticeSetting
}

export interface GraduateListItem extends GraduateRecord {
  submitted_count: number
  latest_submitted_at: string | null
  latest_period_key: string | null
  filled_active_period: boolean
  last_reminded_at: string | null
}

function mapSurveyRow(row: {
  id: string
  slug: string
  title_tr: string
  title_en: string
  definition: SurveyDefinition
  is_open: boolean
  repeat_mode: 'period' | 'cooldown_days' | 'once'
  active_period: string
  cooldown_days: number
}): SurveyRow {
  return {
    id: row.id,
    slug: row.slug,
    title_tr: row.title_tr,
    title_en: row.title_en,
    definition: row.definition ?? (fallbackSurveyJson as unknown as SurveyDefinition),
    is_open: row.is_open,
    repeat_mode: row.repeat_mode,
    active_period: row.active_period,
    cooldown_days: row.cooldown_days,
  }
}

export async function getActiveSurvey(): Promise<SurveyRow> {
  const res = await query<{
    id: string
    slug: string
    title_tr: string
    title_en: string
    definition: SurveyDefinition
    is_open: boolean
    repeat_mode: 'period' | 'cooldown_days' | 'once'
    active_period: string
    cooldown_days: number
  }>(
    `SELECT id, slug, title_tr, title_en, definition, is_open, repeat_mode, active_period, cooldown_days
     FROM surveys
     ORDER BY created_at ASC
     LIMIT 1`
  )
  if (res.rows[0]) {
    return mapSurveyRow(res.rows[0])
  }
  const def = fallbackSurveyJson as unknown as SurveyDefinition
  return {
    id: '',
    slug: def.slug,
    title_tr: def.title.tr,
    title_en: def.title.en,
    definition: def,
    is_open: true,
    repeat_mode: 'period',
    active_period: '2026-Guz',
    cooldown_days: 180,
  }
}

export async function getAppSettings(): Promise<AppSettingsBundle> {
  const res = await query<{ key: string; value: unknown }>(
    `SELECT key, value FROM app_settings WHERE key IN ('whitelist_required', 'kvkk_notice')`
  )
  let whitelistRequired: WhitelistSetting = { enabled: false }
  let kvkkNotice: KvkkNoticeSetting = { ...kvkkDraft }

  for (const row of res.rows) {
    if (row.key === 'whitelist_required' && row.value && typeof row.value === 'object') {
      const v = row.value as Partial<WhitelistSetting>
      whitelistRequired = { enabled: Boolean(v.enabled), note: v.note }
    }
    if (row.key === 'kvkk_notice' && row.value && typeof row.value === 'object') {
      const v = row.value as Partial<KvkkNoticeSetting>
      // Boş yer tutucu kayıtta taslak metin gösterilir; admin gerçek metni girince o kullanılır
      if (typeof v.tr === 'string' && v.tr.trim()) {
        kvkkNotice = {
          version: typeof v.version === 'string' && v.version.trim() ? v.version : 'v1',
          tr: v.tr,
          en: typeof v.en === 'string' && v.en.trim() ? v.en : kvkkDraft.en,
        }
      }
    }
  }
  return { whitelistRequired, kvkkNotice }
}

export async function getSubmittedResponses(surveyId: string): Promise<SubmittedResponseItem[]> {
  if (!surveyId) return []
  const res = await query<{
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
    answers: Record<string, AnswerValue> | null
  }>(
    `SELECT
       r.id,
       r.survey_id,
       r.graduate_id,
       g.email AS graduate_email,
       g.full_name AS graduate_name,
       g.student_number,
       g.graduation_year,
       g.graduation_term,
       r.period_key,
       r.submission_number,
       r.submitted_at::text,
       COALESCE(jsonb_object_agg(a.question_id, a.value) FILTER (WHERE a.question_id IS NOT NULL), '{}'::jsonb) AS answers
     FROM responses r
     JOIN graduates g ON g.id = r.graduate_id
     LEFT JOIN answers a ON a.response_id = r.id
     WHERE r.survey_id = $1 AND r.status = 'submitted'
     GROUP BY r.id, g.id
     ORDER BY r.submitted_at DESC`,
    [surveyId]
  )

  return res.rows.map((r) => ({
    id: r.id,
    survey_id: r.survey_id,
    graduate_id: r.graduate_id,
    graduate_email: r.graduate_email,
    graduate_name: r.graduate_name,
    student_number: r.student_number,
    graduation_year: r.graduation_year,
    graduation_term: r.graduation_term,
    period_key: r.period_key,
    submission_number: r.submission_number,
    submitted_at: r.submitted_at,
    answers: (r.answers ?? {}) as AnswerMap,
  }))
}

export async function getGraduatesWithStatus(
  surveyId: string,
  activePeriod: string
): Promise<GraduateListItem[]> {
  const res = await query<{
    id: string
    email: string
    full_name: string
    student_number: string
    graduation_year: number | null
    graduation_term: 'guz' | 'bahar' | 'yaz' | null
    created_at: string
    updated_at: string
    submitted_count: string
    latest_submitted_at: string | null
    latest_period_key: string | null
    filled_active_period: boolean
    last_reminded_at: string | null
  }>(
    `SELECT
       g.id,
       g.email,
       g.full_name,
       g.student_number,
       g.graduation_year,
       g.graduation_term,
       g.created_at::text,
       g.updated_at::text,
       COUNT(r.id) FILTER (WHERE r.status = 'submitted')::text AS submitted_count,
       MAX(r.submitted_at) FILTER (WHERE r.status = 'submitted')::text AS latest_submitted_at,
       (
         SELECT r2.period_key
         FROM responses r2
         WHERE r2.graduate_id = g.id AND r2.survey_id = $1 AND r2.status = 'submitted'
         ORDER BY r2.submitted_at DESC
         LIMIT 1
       ) AS latest_period_key,
       EXISTS(
         SELECT 1 FROM responses r3
         WHERE r3.graduate_id = g.id
           AND r3.survey_id = $1
           AND r3.status = 'submitted'
           AND r3.period_key = $2
       ) AS filled_active_period,
       (
         SELECT MAX(rl.sent_at)::text
         FROM reminder_logs rl
         WHERE rl.graduate_id = g.id AND rl.survey_id = $1 AND rl.status = 'sent'
       ) AS last_reminded_at
     FROM graduates g
     LEFT JOIN responses r ON r.graduate_id = g.id AND r.survey_id = $1
     WHERE g.anonymized_at IS NULL
     GROUP BY g.id
     ORDER BY g.graduation_year DESC NULLS LAST, g.full_name ASC`,
    [surveyId, activePeriod]
  )

  return res.rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    student_number: row.student_number,
    graduation_year: row.graduation_year,
    graduation_term: row.graduation_term,
    created_at: row.created_at,
    updated_at: row.updated_at,
    submitted_count: Number(row.submitted_count ?? 0),
    latest_submitted_at: row.latest_submitted_at,
    latest_period_key: row.latest_period_key,
    filled_active_period: Boolean(row.filled_active_period),
    last_reminded_at: row.last_reminded_at,
  }))
}

export async function listAdmins(): Promise<AdminUser[]> {
  const res = await query<{
    id: string
    email: string
    full_name: string
    role: 'owner' | 'viewer'
    active: boolean
  }>(`SELECT id, email, full_name, role, active FROM admins ORDER BY role ASC, created_at ASC`)
  return res.rows
}

export interface SubmissionHistoryItem {
  id: string
  period_key: string
  submission_number: number
  submitted_at: string
}

export async function getSubmissionHistory(surveyId: string, graduateId: string): Promise<SubmissionHistoryItem[]> {
  const res = await query<SubmissionHistoryItem>(
    `SELECT id, period_key, submission_number, submitted_at::text
     FROM responses
     WHERE survey_id = $1 AND graduate_id = $2 AND status = 'submitted'
     ORDER BY submitted_at DESC`,
    [surveyId, graduateId]
  )
  return res.rows
}

export async function getDraft(
  surveyId: string,
  graduateId: string
): Promise<{ answers: AnswerMap; updated_at: string } | null> {
  const res = await query<{ answers: AnswerMap; updated_at: string }>(
    `SELECT r.updated_at::text,
            COALESCE(jsonb_object_agg(a.question_id, a.value) FILTER (WHERE a.question_id IS NOT NULL), '{}'::jsonb) AS answers
     FROM responses r
     LEFT JOIN answers a ON a.response_id = r.id
     WHERE r.survey_id = $1 AND r.graduate_id = $2 AND r.status = 'draft'
     GROUP BY r.id
     LIMIT 1`,
    [surveyId, graduateId]
  )
  return res.rows[0] ?? null
}

/** KVKK: mezunun onayladığı son metin sürümü */
export async function getLatestConsentVersion(graduateId: string): Promise<string | null> {
  const res = await query<{ text_version: string }>(
    `SELECT text_version FROM consents WHERE graduate_id = $1 ORDER BY accepted_at DESC LIMIT 1`,
    [graduateId]
  )
  return res.rows[0]?.text_version ?? null
}

let logoCache: Buffer | null | undefined

export function getLogoBuffer(): Buffer | null {
  if (logoCache === undefined) {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'fbu-logo.png')
    logoCache = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null
  }
  return logoCache
}
