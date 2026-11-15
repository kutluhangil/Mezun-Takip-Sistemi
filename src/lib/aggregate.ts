import { SPECIAL_LOCATIONS } from '../../data/provinces'
import type {
  AnswerMap,
  AnswerValue,
  Lang,
  SubmittedResponseItem,
  SurveyDefinition,
  SurveyQuestion,
} from './survey-types'

export interface FilterCriteria {
  period?: string
  graduationYear?: string
  graduationTerm?: string
  workStatus?: string
}

export interface OptionStat {
  value: string
  label: string
  count: number
  pct: number
}

export interface GroupedOtherItem {
  label: string
  count: number
  variants: string[]
}

export interface ScaleStat {
  mean: number
  median: number
  answered: number
  buckets: { score: number; count: number; pct: number }[]
}

export interface MatrixRowStat {
  id: string
  label: string
  answered: number
  mean: number
  counts: Record<string, number>
  pcts: Record<string, number>
}

export interface DurationStat {
  answered: number
  notWorkingCount: number
  workingCount: number
  meanMonths: number
  medianMonths: number
}

export interface TextSummaryStat {
  answered: number
  noneCount: number
  entries: { graduateName: string; graduationYear: number | null; text: string }[]
}

export type QuestionAggregation =
  | {
      kind: 'categorical'
      question: SurveyQuestion
      answered: number
      options: OptionStat[]
      otherGroups: GroupedOtherItem[]
    }
  | {
      kind: 'scale'
      question: SurveyQuestion
      scale: ScaleStat
    }
  | {
      kind: 'matrix'
      question: SurveyQuestion
      answered: number
      columns: { value: string; label: string }[]
      rows: MatrixRowStat[]
    }
  | {
      kind: 'duration'
      question: SurveyQuestion
      duration: DurationStat
    }
  | {
      kind: 'text'
      question: SurveyQuestion
      text: TextSummaryStat
    }

export interface DashboardSummary {
  totalResponses: number
  uniqueGraduatesResponded: number
  totalGraduatesInWhitelist: number
  participationRate: number
  employedCount: number
  inFieldEmployedCount: number
  notWorkingCount: number
  employmentRate: number
  meanSatisfaction: number
  recommendRate: number
  periods: string[]
  graduationYears: number[]
  questions: QuestionAggregation[]
}

export interface CrossTabResult {
  rowQuestion: SurveyQuestion
  colQuestion: SurveyQuestion
  rowLabels: { key: string; label: string }[]
  colLabels: { key: string; label: string }[]
  matrix: Record<string, Record<string, number>>
  rowTotals: Record<string, number>
  colTotals: Record<string, number>
  grandTotal: number
}

const EMPLOYED_VALUES = new Set([
  'kamu_kadrolu',
  'kamu_sozlesmeli',
  'kamu_taseron',
  'ozel_sektor',
  'kendi_sirketim',
  'alan_disi',
])

const IN_FIELD_VALUES = new Set([
  'kamu_kadrolu',
  'kamu_sozlesmeli',
  'kamu_taseron',
  'ozel_sektor',
  'kendi_sirketim',
])

export function extractSingleChoice(val: AnswerValue | undefined): { choice: string; otherText?: string } | null {
  if (!val) return null
  if (typeof val === 'string') return { choice: val }
  if (typeof val === 'number') return { choice: String(val) }
  if (typeof val === 'object' && 'choice' in val) {
    return { choice: val.choice, otherText: val.otherText }
  }
  return null
}

export function extractMultiChoices(val: AnswerValue | undefined): { choices: string[]; otherText?: string } | null {
  if (!val || typeof val !== 'object' || !('choices' in val) || !Array.isArray(val.choices)) return null
  return { choices: val.choices, otherText: val.otherText }
}

export function normalizeTr(input: string): string {
  return input
    .toLocaleLowerCase('tr')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('i̇', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter((w) => w.length >= 2))
  const tb = new Set(b.split(' ').filter((w) => w.length >= 2))
  if (ta.size === 0 || tb.size === 0) return a === b ? 1 : 0
  let inter = 0
  for (const w of ta) if (tb.has(w)) inter++
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

export function groupOtherTexts(texts: string[]): GroupedOtherItem[] {
  const clusters: { norm: string; canonical: string; count: number; variants: Map<string, number> }[] = []

  for (const raw of texts) {
    const cleaned = raw.trim()
    if (!cleaned) continue
    const norm = normalizeTr(cleaned)
    if (!norm) continue

    let matched = clusters.find((c) => c.norm === norm)
    if (!matched) {
      matched = clusters.find(
        (c) =>
          tokenSimilarity(c.norm, norm) >= 0.65 ||
          (norm.length >= 5 && c.norm.length >= 5 && (c.norm.includes(norm) || norm.includes(c.norm)))
      )
    }

    if (matched) {
      matched.count += 1
      matched.variants.set(cleaned, (matched.variants.get(cleaned) ?? 0) + 1)
    } else {
      const variants = new Map<string, number>()
      variants.set(cleaned, 1)
      clusters.push({ norm, canonical: cleaned, count: 1, variants })
    }
  }

  return clusters
    .map((c) => {
      const sortedVariants = [...c.variants.entries()].sort((a, b) => b[1] - a[1])
      return {
        label: sortedVariants[0]?.[0] ?? c.canonical,
        count: c.count,
        variants: sortedVariants.map(([v]) => v),
      }
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'))
}

export function filterResponses(
  items: SubmittedResponseItem[],
  filters: FilterCriteria
): SubmittedResponseItem[] {
  return items.filter((item) => {
    if (filters.period && filters.period !== 'all' && item.period_key !== filters.period) {
      return false
    }
    if (filters.graduationYear && filters.graduationYear !== 'all') {
      const yr = String(item.answers.q_grad_year ?? item.graduation_year ?? '')
      if (yr !== filters.graduationYear) return false
    }
    if (filters.graduationTerm && filters.graduationTerm !== 'all') {
      const termChoice = extractSingleChoice(item.answers.q_grad_term)?.choice ?? item.graduation_term ?? ''
      if (termChoice !== filters.graduationTerm) return false
    }
    if (filters.workStatus && filters.workStatus !== 'all') {
      const ws = extractSingleChoice(item.answers.q_work_status)?.choice ?? ''
      if (ws !== filters.workStatus) return false
    }
    return true
  })
}

export function formatAnswerLabel(q: SurveyQuestion, val: AnswerValue | undefined, lang: Lang): string {
  if (val === undefined || val === null) return '—'

  if (q.type === 'text' || q.type === 'textarea' || q.type === 'year') {
    return String(val).trim() || '—'
  }

  if (q.type === 'province') {
    const s = String(val)
    if (s === SPECIAL_LOCATIONS.notWorking.value) return SPECIAL_LOCATIONS.notWorking[lang]
    if (s === SPECIAL_LOCATIONS.abroad.value) return SPECIAL_LOCATIONS.abroad[lang]
    return s || '—'
  }

  if (q.type === 'scale') {
    return `${val} / ${q.max ?? 10}`
  }

  if (q.type === 'single') {
    const single = extractSingleChoice(val)
    if (!single) return '—'
    if (single.choice === '__other__') {
      const prefix = lang === 'en' ? 'Other' : 'Diğer'
      return single.otherText ? `${prefix}: ${single.otherText}` : prefix
    }
    const opt = q.options?.find((o) => o.value === single.choice)
    return opt ? opt[lang] : single.choice
  }

  if (q.type === 'multi') {
    const multi = extractMultiChoices(val)
    if (!multi || multi.choices.length === 0) return '—'
    return multi.choices
      .map((c) => {
        if (c === '__other__') {
          const prefix = lang === 'en' ? 'Other' : 'Diğer'
          return multi.otherText ? `${prefix}: ${multi.otherText}` : prefix
        }
        return q.options?.find((o) => o.value === c)?.[lang] ?? c
      })
      .join('; ')
  }

  if (q.type === 'text_or_none') {
    if (typeof val === 'object' && 'none' in val) {
      return val.none ? (q.noneLabel?.[lang] ?? (lang === 'en' ? 'None' : 'Yok')) : (val.text?.trim() || '—')
    }
    return '—'
  }

  if (q.type === 'duration') {
    if (typeof val === 'object' && 'notWorking' in val) {
      if (val.notWorking) return lang === 'en' ? 'Not currently working' : 'Çalışmıyorum'
      const y = Number(val.years ?? 0)
      const m = Number(val.months ?? 0)
      return lang === 'en' ? `${y} yr ${m} mo` : `${y} yıl ${m} ay`
    }
    return '—'
  }

  if (q.type === 'matrix') {
    if (typeof val === 'object' && !Array.isArray(val)) {
      const rec = val as Record<string, string>
      return (q.rows ?? [])
        .map((r, idx) => `${idx + 1}: ${rec[r.id] ?? '—'}`)
        .join(' | ')
    }
    return '—'
  }

  return '—'
}

function medianOf(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
}

export function aggregateSurvey(params: {
  definition: SurveyDefinition
  responses: SubmittedResponseItem[]
  allResponsesForFacets?: SubmittedResponseItem[]
  totalGraduatesInWhitelist: number
  lang: Lang
}): DashboardSummary {
  const { definition, responses, totalGraduatesInWhitelist, lang } = params
  const facetSource = params.allResponsesForFacets ?? responses

  const periods = [...new Set(facetSource.map((r) => r.period_key))].sort().reverse()
  const graduationYears = [
    ...new Set(
      facetSource
        .map((r) => Number(r.answers.q_grad_year ?? r.graduation_year ?? 0))
        .filter((y) => y > 2000)
    ),
  ].sort((a, b) => b - a)

  const uniqueGraduatesResponded = new Set(responses.map((r) => r.graduate_id)).size
  const totalResponses = responses.length
  const participationRate =
    totalGraduatesInWhitelist > 0
      ? Number(((uniqueGraduatesResponded / totalGraduatesInWhitelist) * 100).toFixed(1))
      : 0

  let employedCount = 0
  let inFieldEmployedCount = 0
  let notWorkingCount = 0
  const satisfactionScores: number[] = []
  let recommendPositive = 0
  let recommendAnswered = 0

  for (const r of responses) {
    const ws = extractSingleChoice(r.answers.q_work_status)?.choice
    if (ws) {
      if (EMPLOYED_VALUES.has(ws) || ws === '__other__') employedCount++
      else notWorkingCount++
      if (IN_FIELD_VALUES.has(ws)) inFieldEmployedCount++
    }
    const sat = r.answers.q_satisfaction
    if (typeof sat === 'number' && Number.isFinite(sat)) {
      satisfactionScores.push(sat)
    }
    const rec = extractSingleChoice(r.answers.q_recommend_uni)?.choice
    if (rec) {
      recommendAnswered++
      if (rec === 'kesinlikle_evet' || rec === 'evet') recommendPositive++
    }
  }

  const employmentRate =
    totalResponses > 0 ? Number(((employedCount / totalResponses) * 100).toFixed(1)) : 0
  const meanSatisfaction =
    satisfactionScores.length > 0
      ? Number((satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length).toFixed(2))
      : 0
  const recommendRate =
    recommendAnswered > 0 ? Number(((recommendPositive / recommendAnswered) * 100).toFixed(1)) : 0

  const questions: QuestionAggregation[] = definition.questions
    .filter((q) => !q.lockedFromProfile)
    .map((q) => aggregateQuestion(q, responses, lang))

  return {
    totalResponses,
    uniqueGraduatesResponded,
    totalGraduatesInWhitelist,
    participationRate,
    employedCount,
    inFieldEmployedCount,
    notWorkingCount,
    employmentRate,
    meanSatisfaction,
    recommendRate,
    periods,
    graduationYears,
    questions,
  }
}

export function aggregateQuestion(
  q: SurveyQuestion,
  responses: SubmittedResponseItem[],
  lang: Lang
): QuestionAggregation {
  if (q.type === 'single' || q.type === 'multi' || q.type === 'year' || q.type === 'province') {
    const counts = new Map<string, number>()
    const otherTexts: string[] = []
    let answered = 0

    for (const r of responses) {
      const val = r.answers[q.id]
      if (val === undefined || val === null) continue

      if (q.type === 'single') {
        const s = extractSingleChoice(val)
        if (!s || !s.choice) continue
        answered++
        counts.set(s.choice, (counts.get(s.choice) ?? 0) + 1)
        if (s.choice === '__other__' && s.otherText) otherTexts.push(s.otherText)
      } else if (q.type === 'multi') {
        const m = extractMultiChoices(val)
        if (!m || m.choices.length === 0) continue
        answered++
        for (const c of m.choices) {
          counts.set(c, (counts.get(c) ?? 0) + 1)
        }
        if (m.choices.includes('__other__') && m.otherText) otherTexts.push(m.otherText)
      } else {
        const key = String(val).trim()
        if (!key) continue
        answered++
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }

    const baseList: OptionStat[] = []
    if (q.options) {
      for (const opt of q.options) {
        const c = counts.get(opt.value) ?? 0
        baseList.push({
          value: opt.value,
          label: opt[lang],
          count: c,
          pct: answered > 0 ? Number(((c / answered) * 100).toFixed(1)) : 0,
        })
      }
      if (q.allowOther) {
        const oc = counts.get('__other__') ?? 0
        baseList.push({
          value: '__other__',
          label: lang === 'en' ? 'Other' : 'Diğer',
          count: oc,
          pct: answered > 0 ? Number(((oc / answered) * 100).toFixed(1)) : 0,
        })
      }
    } else {
      const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
      for (const [k, c] of entries) {
        let label = k
        if (q.type === 'province') {
          if (k === SPECIAL_LOCATIONS.notWorking.value) label = SPECIAL_LOCATIONS.notWorking[lang]
          else if (k === SPECIAL_LOCATIONS.abroad.value) label = SPECIAL_LOCATIONS.abroad[lang]
        }
        baseList.push({
          value: k,
          label,
          count: c,
          pct: answered > 0 ? Number(((c / answered) * 100).toFixed(1)) : 0,
        })
      }
    }

    return {
      kind: 'categorical',
      question: q,
      answered,
      options: baseList,
      otherGroups: groupOtherTexts(otherTexts),
    }
  }

  if (q.type === 'scale') {
    const min = q.min ?? 0
    const max = q.max ?? 10
    const vals: number[] = []
    const bucketCounts = new Map<number, number>()
    for (let s = min; s <= max; s++) bucketCounts.set(s, 0)

    for (const r of responses) {
      const raw = r.answers[q.id]
      if (raw === undefined || raw === null) continue
      const num = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(num) || num < min || num > max) continue
      vals.push(num)
      bucketCounts.set(num, (bucketCounts.get(num) ?? 0) + 1)
    }

    const sorted = [...vals].sort((a, b) => a - b)
    const mean = vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0

    return {
      kind: 'scale',
      question: q,
      scale: {
        answered: vals.length,
        mean,
        median: medianOf(sorted),
        buckets: [...bucketCounts.entries()].map(([score, count]) => ({
          score,
          count,
          pct: vals.length > 0 ? Number(((count / vals.length) * 100).toFixed(1)) : 0,
        })),
      },
    }
  }

  if (q.type === 'matrix') {
    const cols = q.columns ?? []
    const rows = q.rows ?? []
    let answered = 0

    const rowStats: MatrixRowStat[] = rows.map((row) => {
      const counts: Record<string, number> = {}
      for (const col of cols) counts[col.value] = 0
      let rAnswered = 0
      let sum = 0

      for (const resp of responses) {
        const val = resp.answers[q.id]
        if (!val || typeof val !== 'object' || Array.isArray(val)) continue
        const pick = (val as Record<string, string>)[row.id]
        if (!pick || counts[pick] === undefined) continue
        counts[pick] += 1
        rAnswered += 1
        sum += Number(pick) || 0
      }

      const pcts: Record<string, number> = {}
      for (const col of cols) {
        pcts[col.value] = rAnswered > 0 ? Number(((counts[col.value] / rAnswered) * 100).toFixed(1)) : 0
      }

      return {
        id: row.id,
        label: row[lang],
        answered: rAnswered,
        mean: rAnswered > 0 ? Number((sum / rAnswered).toFixed(2)) : 0,
        counts,
        pcts,
      }
    })

    for (const resp of responses) {
      const val = resp.answers[q.id]
      if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
        answered++
      }
    }

    return {
      kind: 'matrix',
      question: q,
      answered,
      columns: cols.map((c) => ({ value: c.value, label: c[lang] })),
      rows: rowStats,
    }
  }

  if (q.type === 'duration') {
    let answered = 0
    let notWorkingCount = 0
    const monthsList: number[] = []

    for (const resp of responses) {
      const val = resp.answers[q.id]
      if (!val || typeof val !== 'object' || !('notWorking' in val)) continue
      answered++
      if (val.notWorking) {
        notWorkingCount++
      } else {
        const totalM = Number(val.years ?? 0) * 12 + Number(val.months ?? 0)
        monthsList.push(totalM)
      }
    }

    const sorted = [...monthsList].sort((a, b) => a - b)
    return {
      kind: 'duration',
      question: q,
      duration: {
        answered,
        notWorkingCount,
        workingCount: monthsList.length,
        meanMonths:
          monthsList.length > 0
            ? Number((monthsList.reduce((a, b) => a + b, 0) / monthsList.length).toFixed(1))
            : 0,
        medianMonths: medianOf(sorted),
      },
    }
  }

  // text / textarea / text_or_none
  let answered = 0
  let noneCount = 0
  const entries: TextSummaryStat['entries'] = []

  for (const resp of responses) {
    const val = resp.answers[q.id]
    if (val === undefined || val === null) continue
    if (typeof val === 'object' && 'none' in val) {
      answered++
      if (val.none) noneCount++
      else if (val.text?.trim()) {
        entries.push({
          graduateName: resp.graduate_name,
          graduationYear: resp.graduation_year,
          text: val.text.trim(),
        })
      }
    } else if (typeof val === 'string' && val.trim()) {
      answered++
      entries.push({
        graduateName: resp.graduate_name,
        graduationYear: resp.graduation_year,
        text: val.trim(),
      })
    }
  }

  return {
    kind: 'text',
    question: q,
    text: { answered, noneCount, entries },
  }
}

export function getCrossTabKeyAndLabel(
  q: SurveyQuestion,
  answers: AnswerMap,
  lang: Lang
): { key: string; label: string } | null {
  const val = answers[q.id]
  if (val === undefined || val === null) return null

  if (q.type === 'single') {
    const s = extractSingleChoice(val)
    if (!s || !s.choice) return null
    if (s.choice === '__other__') {
      return { key: '__other__', label: lang === 'en' ? 'Other' : 'Diğer' }
    }
    const opt = q.options?.find((o) => o.value === s.choice)
    return { key: s.choice, label: opt ? opt[lang] : s.choice }
  }

  if (q.type === 'year' || q.type === 'scale') {
    const k = String(val)
    return { key: k, label: k }
  }

  if (q.type === 'province') {
    const k = String(val)
    if (k === SPECIAL_LOCATIONS.notWorking.value) return { key: k, label: SPECIAL_LOCATIONS.notWorking[lang] }
    if (k === SPECIAL_LOCATIONS.abroad.value) return { key: k, label: SPECIAL_LOCATIONS.abroad[lang] }
    return { key: k, label: k }
  }

  return null
}

export function computeCrossTab(params: {
  rowQuestion: SurveyQuestion
  colQuestion: SurveyQuestion
  responses: SubmittedResponseItem[]
  lang: Lang
}): CrossTabResult {
  const { rowQuestion, colQuestion, responses, lang } = params
  const rowMap = new Map<string, string>()
  const colMap = new Map<string, string>()
  const matrix: Record<string, Record<string, number>> = {}
  const rowTotals: Record<string, number> = {}
  const colTotals: Record<string, number> = {}
  let grandTotal = 0

  for (const r of responses) {
    const rk = getCrossTabKeyAndLabel(rowQuestion, r.answers, lang)
    const ck = getCrossTabKeyAndLabel(colQuestion, r.answers, lang)
    if (!rk || !ck) continue

    rowMap.set(rk.key, rk.label)
    colMap.set(ck.key, ck.label)

    if (!matrix[rk.key]) matrix[rk.key] = {}
    matrix[rk.key][ck.key] = (matrix[rk.key][ck.key] ?? 0) + 1
    rowTotals[rk.key] = (rowTotals[rk.key] ?? 0) + 1
    colTotals[ck.key] = (colTotals[ck.key] ?? 0) + 1
    grandTotal++
  }

  const orderedKeys = (q: SurveyQuestion, map: Map<string, string>) => {
    if (q.options) {
      const out: { key: string; label: string }[] = []
      for (const o of q.options) {
        if (map.has(o.value)) out.push({ key: o.value, label: o[lang] })
      }
      if (map.has('__other__')) out.push({ key: '__other__', label: map.get('__other__')! })
      return out
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'tr', { numeric: true }))
      .map(([key, label]) => ({ key, label }))
  }

  return {
    rowQuestion,
    colQuestion,
    rowLabels: orderedKeys(rowQuestion, rowMap),
    colLabels: orderedKeys(colQuestion, colMap),
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
  }
}
