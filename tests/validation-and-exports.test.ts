import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import surveyJson from '../data/surveys/mezun-bilgi-2026.json'
import { aggregateSurvey } from '../src/lib/aggregate'
import { generateCsvExport } from '../src/lib/exports/csv'
import { generateDocxReport } from '../src/lib/exports/docx-report'
import { generateExcelExport } from '../src/lib/exports/excel'
import { generatePdfReport } from '../src/lib/exports/pdf-report'
import type { GraduateListItem } from '../src/lib/server-data'
import { checkSubmissionEligibility, validateSurveyAnswers } from '../src/lib/survey-validation'
import type { AnswerMap, SubmittedResponseItem, SurveyDefinition } from '../src/lib/survey-types'

const definition = surveyJson as unknown as SurveyDefinition

function validAnswers(): AnswerMap {
  const matrix: Record<string, string> = {}
  const matrixQ = definition.questions.find((q) => q.id === 'q_program_matrix')!
  for (const r of matrixQ.rows ?? []) matrix[r.id] = '5'

  return {
    q_full_name: 'Ayşe Demir',
    q_email: 'ayse@example.com',
    q_student_number: '210401001',
    q_grad_year: 2023,
    q_grad_term: { choice: 'bahar' },
    q_work_status: { choice: 'kamu_sozlesmeli' },
    q_job_title: { choice: 'paramedik_112' },
    q_institution: { choice: '112_istasyonu' },
    q_prev_workplaces: { none: true },
    q_unemployment_duration: { choice: 'lt_6m' },
    q_how_found_first_job: { choice: 'kpss' },
    q_workplace_order: { choice: '1' },
    q_work_province: 'İstanbul',
    q_total_experience: { notWorking: false, years: 1, months: 4 },
    q_current_tenure: { notWorking: true },
    q_monthly_income: { choice: 'mw_1_5_2' },
    q_continue_paramedic: { choice: 'evet' },
    q_abroad_interest: { choice: 'no' },
    q_career_develop: { choices: ['uygulamaci'] },
    q_certificates: { none: false, text: 'TYD, İYD' },
    q_scientific_research: { choice: 'hayir' },
    q_dgs_status: { choice: 'hayir' },
    q_keep_ties: { choice: 'evet' },
    q_recommend_uni: { choice: 'kesinlikle_evet' },
    q_alumni_reunion: { choice: 'evet' },
    q_satisfaction: 10,
    q_strengths: { choices: ['s1', 's2', 's3'] },
    q_weaknesses: { choices: ['w2', 'w4'] },
    q_program_matrix: matrix,
    q_suggestions: 'Simülasyon dersi çok yararlıydı.',
  }
}

describe('eligibility & survey validation', () => {
  it('enforces period, cooldown_days (180d), once, and is_open', () => {
    expect(
      checkSubmissionEligibility({
        isOpen: false,
        repeatMode: 'period',
        activePeriod: '2026-Guz',
        cooldownDays: 180,
        latestSubmittedAt: null,
        latestPeriodKey: null,
      }).reason
    ).toBe('survey_closed')

    expect(
      checkSubmissionEligibility({
        isOpen: true,
        repeatMode: 'period',
        activePeriod: '2026-Guz',
        cooldownDays: 180,
        latestSubmittedAt: '2026-10-01T00:00:00Z',
        latestPeriodKey: '2026-Guz',
      }).allowed
    ).toBe(false)

    expect(
      checkSubmissionEligibility({
        isOpen: true,
        repeatMode: 'period',
        activePeriod: '2027-Bahar',
        cooldownDays: 180,
        latestSubmittedAt: '2026-10-01T00:00:00Z',
        latestPeriodKey: '2026-Guz',
      }).allowed
    ).toBe(true)

    const nowShort = new Date('2026-11-01T00:00:00Z')
    expect(
      checkSubmissionEligibility({
        isOpen: true,
        repeatMode: 'cooldown_days',
        activePeriod: '2026-Guz',
        cooldownDays: 180,
        latestSubmittedAt: '2026-10-01T00:00:00Z',
        latestPeriodKey: '2026-Guz',
        now: nowShort,
      }).reason
    ).toBe('cooldown_active')

    const nowLong = new Date('2027-06-01T00:00:00Z')
    expect(
      checkSubmissionEligibility({
        isOpen: true,
        repeatMode: 'cooldown_days',
        activePeriod: '2026-Guz',
        cooldownDays: 180,
        latestSubmittedAt: '2026-10-01T00:00:00Z',
        latestPeriodKey: '2026-Guz',
        now: nowLong,
      }).allowed
    ).toBe(true)
  })

  it('validates complete answers, maxSelect limit, and __other__ text requirement', () => {
    const ok = validAnswers()
    expect(validateSurveyAnswers(definition, ok, 'tr')).toHaveLength(0)

    const tooManyStrengths: AnswerMap = {
      ...ok,
      q_strengths: { choices: ['s1', 's2', 's3', 's4'] },
      q_work_status: { choice: '__other__', otherText: '' },
    }
    const errs = validateSurveyAnswers(definition, tooManyStrengths, 'tr')
    expect(errs.some((e) => e.questionId === 'q_strengths')).toBe(true)
    expect(errs.some((e) => e.questionId === 'q_work_status')).toBe(true)
  })
})

describe('report exports (csv, xlsx, docx, pdf)', () => {
  const answers = validAnswers()
  const resp: SubmittedResponseItem = {
    id: 'resp-1',
    survey_id: 'survey-1',
    graduate_id: 'grad-1',
    graduate_email: 'ayse@example.com',
    graduate_name: 'Ayşe Demir',
    student_number: '210401001',
    graduation_year: 2023,
    graduation_term: 'bahar',
    period_key: '2026-Guz',
    submission_number: 1,
    submitted_at: '2026-10-15T10:00:00Z',
    answers,
  }
  const grads: GraduateListItem[] = [
    {
      id: 'grad-1',
      email: 'ayse@example.com',
      full_name: 'Ayşe Demir',
      student_number: '210401001',
      graduation_year: 2023,
      graduation_term: 'bahar',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      submitted_count: 1,
      latest_submitted_at: '2026-10-15T10:00:00Z',
      latest_period_key: '2026-Guz',
      filled_active_period: true,
      last_reminded_at: null,
    },
  ]

  it('generates UTF-8 BOM CSV with Turkish characters intact', () => {
    const buf = generateCsvExport({ definition, responses: [resp], lang: 'tr' })
    const text = buf.toString('utf8')
    expect(text.startsWith('\uFEFF')).toBe(true)
    expect(text).toContain('Ayşe Demir')
    expect(text).toContain('İstanbul')
  })

  it('generates 4-sheet Excel workbook (.xlsx)', async () => {
    const summary = aggregateSurvey({ definition, responses: [resp], totalGraduatesInWhitelist: 1, lang: 'tr' })
    const buf = await generateExcelExport({
      definition,
      summary,
      responses: [resp],
      graduates: grads,
      filterLabel: 'Tüm Kayıtlar',
      lang: 'tr',
    })
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0])
    expect(wb.worksheets).toHaveLength(4)
  })

  it('generates Word report (.docx)', async () => {
    const summary = aggregateSurvey({ definition, responses: [resp], totalGraduatesInWhitelist: 1, lang: 'tr' })
    const buf = await generateDocxReport({
      summary,
      filterLabel: 'Tüm Kayıtlar',
      lang: 'tr',
      logoBuffer: null,
    })
    expect(buf.slice(0, 2).toString('utf8')).toBe('PK')
    expect(buf.length).toBeGreaterThan(2000)
  })

  it('generates charted PDF report with Turkish DejaVu fonts (.pdf)', async () => {
    const summary = aggregateSurvey({ definition, responses: [resp], totalGraduatesInWhitelist: 1, lang: 'en' })
    const buf = await generatePdfReport({
      summary,
      filterLabel: 'All Records',
      lang: 'en',
      logoBuffer: null,
    })
    expect(buf.slice(0, 5).toString('utf8')).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(4000)
  })
})
