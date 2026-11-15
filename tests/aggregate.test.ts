import { describe, expect, it } from 'vitest'
import surveyJson from '../data/surveys/mezun-bilgi-2026.json'
import {
  aggregateSurvey,
  computeCrossTab,
  filterResponses,
  groupOtherTexts,
} from '../src/lib/aggregate'
import type { SubmittedResponseItem, SurveyDefinition } from '../src/lib/survey-types'

const definition = surveyJson as unknown as SurveyDefinition

function sampleResponse(overrides: Partial<SubmittedResponseItem> = {}): SubmittedResponseItem {
  return {
    id: 'r1',
    survey_id: 's1',
    graduate_id: 'g1',
    graduate_email: 'ayse@example.com',
    graduate_name: 'Ayşe Demir',
    student_number: '210401001',
    graduation_year: 2023,
    graduation_term: 'bahar',
    period_key: '2026-Guz',
    submission_number: 1,
    submitted_at: '2026-10-15T10:00:00Z',
    answers: {
      q_grad_year: 2023,
      q_grad_term: { choice: 'bahar' },
      q_work_status: { choice: 'kamu_sozlesmeli' },
      q_job_title: { choice: 'paramedik_112' },
      q_institution: { choice: '112_istasyonu' },
      q_prev_workplaces: { none: false, text: 'Özel Ambulans' },
      q_unemployment_duration: { choice: 'lt_6m' },
      q_how_found_first_job: { choice: 'kpss' },
      q_workplace_order: { choice: '1' },
      q_work_province: 'İstanbul',
      q_total_experience: { notWorking: false, years: 2, months: 0 },
      q_current_tenure: { notWorking: false, years: 1, months: 6 },
      q_monthly_income: { choice: 'mw_1_5_2' },
      q_continue_paramedic: { choice: 'evet' },
      q_abroad_interest: { choice: 'want_abroad' },
      q_career_develop: { choices: ['uygulamaci', '__other__'], otherText: 'Triyaj eğitimi' },
      q_certificates: { none: true },
      q_scientific_research: { choice: 'hayir' },
      q_dgs_status: { choice: 'planliyorum' },
      q_keep_ties: { choice: 'evet' },
      q_recommend_uni: { choice: 'kesinlikle_evet' },
      q_alumni_reunion: { choice: 'evet' },
      q_satisfaction: 9,
      q_strengths: { choices: ['s1', 's2', 's5'] },
      q_weaknesses: { choices: ['w1'] },
      q_program_matrix: { m1: '5', m2: '4', m3: '4' },
      q_suggestions: 'Uygulamalar harikaydı.',
    },
    ...overrides,
  }
}

describe('aggregate & filters', () => {
  const responses: SubmittedResponseItem[] = [
    sampleResponse({ id: 'r1', graduate_id: 'g1' }),
    sampleResponse({
      id: 'r2',
      graduate_id: 'g2',
      graduate_name: 'Mehmet Kaya',
      graduation_year: 2024,
      graduation_term: 'guz',
      period_key: '2027-Bahar',
      answers: {
        ...sampleResponse().answers,
        q_grad_year: 2024,
        q_grad_term: { choice: 'guz' },
        q_work_status: { choice: 'kpss_hazirlik' },
        q_job_title: { choice: 'calismiyorum' },
        q_total_experience: { notWorking: true },
        q_recommend_uni: { choice: 'hayir' },
        q_satisfaction: 5,
        q_career_develop: { choices: ['__other__'], otherText: 'Triyaj Egitimi!' },
        q_program_matrix: { m1: '3', m2: '2' },
      },
    }),
  ]

  it('filters by period, year, term, and workStatus', () => {
    expect(filterResponses(responses, { period: '2026-Guz' })).toHaveLength(1)
    expect(filterResponses(responses, { graduationYear: '2024' })).toHaveLength(1)
    expect(filterResponses(responses, { graduationTerm: 'guz' })).toHaveLength(1)
    expect(filterResponses(responses, { workStatus: 'kamu_sozlesmeli' })).toHaveLength(1)
    expect(filterResponses(responses, { period: 'all' })).toHaveLength(2)
  })

  it('groups similar Diğer free-text answers cleanly across Turkish diacritics', () => {
    const groups = groupOtherTexts([
      'Triyaj eğitimi',
      'Triyaj Egitimi!',
      'EKG Yorumlama',
      'ekg yorumlama kursu',
    ])
    expect(groups.length).toBe(2)
    expect(groups[0].count).toBe(2)
  })

  it('computes KPI summary, scale stats, Likert means, and durations', () => {
    const summary = aggregateSurvey({
      definition,
      responses,
      totalGraduatesInWhitelist: 4,
      lang: 'tr',
    })

    expect(summary.totalResponses).toBe(2)
    expect(summary.uniqueGraduatesResponded).toBe(2)
    expect(summary.participationRate).toBe(50)
    expect(summary.employedCount).toBe(1)
    expect(summary.notWorkingCount).toBe(1)
    expect(summary.employmentRate).toBe(50)
    expect(summary.meanSatisfaction).toBe(7)
    expect(summary.recommendRate).toBe(50)

    const expAgg = summary.questions.find((q) => q.question.id === 'q_total_experience')
    expect(expAgg?.kind).toBe('duration')
    if (expAgg?.kind === 'duration') {
      expect(expAgg.duration.workingCount).toBe(1)
      expect(expAgg.duration.notWorkingCount).toBe(1)
      expect(expAgg.duration.meanMonths).toBe(24)
    }

    const matrixAgg = summary.questions.find((q) => q.question.id === 'q_program_matrix')
    expect(matrixAgg?.kind).toBe('matrix')
    if (matrixAgg?.kind === 'matrix') {
      const m1 = matrixAgg.rows.find((r) => r.id === 'm1')
      expect(m1?.mean).toBe(4)
    }
  })

  it('computes two-question cross-tabulation totals', () => {
    const rowQ = definition.questions.find((q) => q.id === 'q_grad_year')!
    const colQ = definition.questions.find((q) => q.id === 'q_work_status')!
    const ct = computeCrossTab({ rowQuestion: rowQ, colQuestion: colQ, responses, lang: 'tr' })

    expect(ct.grandTotal).toBe(2)
    expect(ct.matrix['2023']['kamu_sozlesmeli']).toBe(1)
    expect(ct.matrix['2024']['kpss_hazirlik']).toBe(1)
  })
})
