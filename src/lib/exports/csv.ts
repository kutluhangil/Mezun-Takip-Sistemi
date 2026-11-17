import { formatAnswerLabel } from '../aggregate'
import type { Lang, SubmittedResponseItem, SurveyDefinition } from '../survey-types'

/** Excel/Sheets bu karakterlerle başlayan hücreyi formül sayar; başına ' eklenerek düz metne çevrilir. */
const FORMULA_START = /^[=+\-@\t\r]/

export function csvEscape(raw: unknown): string {
  const s = raw === null || raw === undefined ? '' : String(raw)
  let clean = s.replace(/\r?\n/g, ' ')
  if (typeof raw === 'string' && FORMULA_START.test(clean)) clean = `'${clean}`
  if (clean.includes(',') || clean.includes('"') || clean.includes(';')) {
    return `"${clean.replaceAll('"', '""')}"`
  }
  return clean
}

export function generateCsvExport(params: {
  definition: SurveyDefinition
  responses: SubmittedResponseItem[]
  lang: Lang
  /** KVKK: kimlik sütunları (ad, e-posta, öğrenci no) çıkarılır */
  anonymous?: boolean
}): Buffer {
  const { definition, responses, lang, anonymous = false } = params
  const isEn = lang === 'en'

  const headers: string[] = [
    isEn ? 'Submission ID' : 'Yanit ID',
    isEn ? 'Period' : 'Donem',
    isEn ? 'Submission #' : 'Gonderim Sirasi',
    isEn ? 'Submitted At' : 'Gonderim Tarihi',
    ...(anonymous
      ? []
      : [isEn ? 'Graduate Name' : 'Mezun Ad Soyad', isEn ? 'Email' : 'E-posta', isEn ? 'Student Number' : 'Ogrenci No']),
    isEn ? 'Graduation Year (Profile)' : 'Mezuniyet Yili (Profil)',
    isEn ? 'Graduation Term (Profile)' : 'Mezuniyet Donemi (Profil)',
  ]

  type ColSpec =
    | { kind: 'question'; qId: string }
    | { kind: 'matrix_row'; qId: string; rowId: string }

  const specs: ColSpec[] = []

  for (const q of definition.questions) {
    if (q.lockedFromProfile) continue
    if (anonymous && q.id === 'q_student_number') continue
    if (q.type === 'matrix' && q.rows) {
      for (const row of q.rows) {
        headers.push(`${q.id}.${row.id} — ${row[lang]}`)
        specs.push({ kind: 'matrix_row', qId: q.id, rowId: row.id })
      }
    } else {
      headers.push(`${q.id} — ${q.label[lang]}`)
      specs.push({ kind: 'question', qId: q.id })
    }
  }

  const lines: string[] = [headers.map(csvEscape).join(',')]
  const questionMap = new Map(definition.questions.map((q) => [q.id, q]))

  for (const resp of responses) {
    const row: string[] = [
      csvEscape(resp.id),
      csvEscape(resp.period_key),
      csvEscape(resp.submission_number),
      csvEscape(resp.submitted_at),
      ...(anonymous ? [] : [csvEscape(resp.graduate_name), csvEscape(resp.graduate_email), csvEscape(resp.student_number)]),
      csvEscape(resp.graduation_year ?? ''),
      csvEscape(resp.graduation_term ?? ''),
    ]

    for (const spec of specs) {
      if (anonymous && spec.qId === 'q_student_number') continue
      const q = questionMap.get(spec.qId)
      if (!q) {
        row.push('')
        continue
      }
      if (spec.kind === 'question') {
        row.push(csvEscape(formatAnswerLabel(q, resp.answers[q.id], lang)))
      } else {
        const val = resp.answers[q.id]
        const rec = val && typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, string>) : null
        const pick = rec ? rec[spec.rowId] : undefined
        const colLabel = pick ? q.columns?.find((c) => c.value === pick)?.[lang] ?? pick : '—'
        row.push(csvEscape(colLabel))
      }
    }
    lines.push(row.join(','))
  }

  // UTF-8 BOM: Excel ve SPSS Türkçe karakterleri bozulmadan açar
  const bom = '\uFEFF'
  return Buffer.from(bom + lines.join('\r\n'), 'utf8')
}
