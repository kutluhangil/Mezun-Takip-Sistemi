import ExcelJS from 'exceljs'
import { formatAnswerLabel, type DashboardSummary } from '../aggregate'
import type { GraduateListItem } from '../server-data'
import type { Lang, SubmittedResponseItem, SurveyDefinition } from '../survey-types'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF141413' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFF9F9F7' },
  size: 11,
}

const ACCENT_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF4EEEB' },
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  })
  row.height = 24
}

export async function generateExcelExport(params: {
  definition: SurveyDefinition
  summary: DashboardSummary
  responses: SubmittedResponseItem[]
  graduates: GraduateListItem[]
  filterLabel: string
  lang: Lang
}): Promise<Buffer> {
  const { definition, summary, responses, graduates, filterLabel, lang } = params
  const isEn = lang === 'en'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FBÜ İlk ve Acil Yardım Mezun Takip Sistemi'
  workbook.created = new Date()

  // 1. ÖZET SEKMESİ
  const wsSummary = workbook.addWorksheet(isEn ? 'Summary' : 'Ozet')
  wsSummary.columns = [
    { key: 'metric', width: 38 },
    { key: 'value', width: 26 },
  ]
  const titleRow = wsSummary.addRow([
    isEn ? 'Fenerbahçe University · First and Emergency Aid' : 'Fenerbahçe Üniversitesi · İlk ve Acil Yardım',
    isEn ? 'Alumni Report' : 'Mezun Raporu',
  ])
  styleHeaderRow(titleRow)
  wsSummary.addRow([isEn ? 'Applied Filter' : 'Uygulanan Filtre', filterLabel])
  wsSummary.addRow([isEn ? 'Generated At' : 'Oluşturulma Tarihi', new Date().toLocaleString(isEn ? 'en-US' : 'tr-TR')])
  wsSummary.addRow([])

  const kpiHeader = wsSummary.addRow([isEn ? 'Metric' : 'Gösterge', isEn ? 'Value' : 'Değer'])
  styleHeaderRow(kpiHeader)
  wsSummary.addRow([isEn ? 'Total Submitted Responses' : 'Toplam Gönderilen Yanıt', summary.totalResponses])
  wsSummary.addRow([isEn ? 'Unique Graduates Responded' : 'Katılan Tekil Mezun', summary.uniqueGraduatesResponded])
  wsSummary.addRow([isEn ? 'Listed Graduates (Whitelist)' : 'Kayıtlı Mezun Listesi', summary.totalGraduatesInWhitelist])
  wsSummary.addRow([isEn ? 'Participation Rate (%)' : 'Katılım Oranı (%)', summary.participationRate])
  wsSummary.addRow([isEn ? 'Employed Count' : 'Çalışan Mezun Sayısı', summary.employedCount])
  wsSummary.addRow([isEn ? 'In-Field Paramedic Employed' : 'Alan İçi İstihdam', summary.inFieldEmployedCount])
  wsSummary.addRow([isEn ? 'Not Working Count' : 'Çalışmayan Mezun', summary.notWorkingCount])
  wsSummary.addRow([isEn ? 'Employment Rate (%)' : 'İstihdam Oranı (%)', summary.employmentRate])
  wsSummary.addRow([isEn ? 'Mean Satisfaction (0–10)' : 'Memnuniyet Ortalaması (0–10)', summary.meanSatisfaction])
  wsSummary.addRow([isEn ? 'Recommend University (%)' : 'Üniversiteyi Önerme Oranı (%)', summary.recommendRate])

  // 2. SORU DAĞILIMLARI
  const wsDist = workbook.addWorksheet(isEn ? 'Distributions' : 'Soru Dagilimlari')
  wsDist.columns = [
    { key: 'qid', width: 22 },
    { key: 'question', width: 48 },
    { key: 'item', width: 42 },
    { key: 'count', width: 14 },
    { key: 'pct', width: 14 },
  ]
  const distHead = wsDist.addRow([
    isEn ? 'Question ID' : 'Soru Kodu',
    isEn ? 'Question' : 'Soru',
    isEn ? 'Option / Item' : 'Seçenek / Madde',
    isEn ? 'Count / Mean' : 'Sayı / Ort.',
    isEn ? 'Rate (%)' : 'Oran (%)',
  ])
  styleHeaderRow(distHead)

  for (const agg of summary.questions) {
    if (agg.kind === 'categorical') {
      for (const opt of agg.options) {
        wsDist.addRow([agg.question.id, agg.question.label[lang], opt.label, opt.count, opt.pct])
      }
      for (const g of agg.otherGroups) {
        wsDist.addRow([
          agg.question.id,
          agg.question.label[lang],
          `${isEn ? '[Other grouped]' : '[Diğer grup]'} ${g.label}`,
          g.count,
          agg.answered > 0 ? Number(((g.count / agg.answered) * 100).toFixed(1)) : 0,
        ])
      }
    } else if (agg.kind === 'scale') {
      const r = wsDist.addRow([
        agg.question.id,
        agg.question.label[lang],
        isEn ? `Mean: ${agg.scale.mean} / Median: ${agg.scale.median}` : `Ort: ${agg.scale.mean} / Medyan: ${agg.scale.median}`,
        agg.scale.answered,
        100,
      ])
      r.eachCell((c) => {
        c.fill = ACCENT_FILL
      })
      for (const b of agg.scale.buckets) {
        wsDist.addRow([agg.question.id, agg.question.label[lang], `${b.score} / 10`, b.count, b.pct])
      }
    } else if (agg.kind === 'matrix') {
      for (const row of agg.rows) {
        const summaryStr = agg.columns
          .map((c) => `${c.label}: ${row.counts[c.value] ?? 0} (%${row.pcts[c.value] ?? 0})`)
          .join(' | ')
        wsDist.addRow([agg.question.id, `${agg.question.label[lang]} — ${row.label}`, summaryStr, row.mean, 100])
      }
    } else if (agg.kind === 'duration') {
      wsDist.addRow([
        agg.question.id,
        agg.question.label[lang],
        isEn
          ? `Mean: ${agg.duration.meanMonths} mo | Median: ${agg.duration.medianMonths} mo | Not working: ${agg.duration.notWorkingCount}`
          : `Ort: ${agg.duration.meanMonths} ay | Medyan: ${agg.duration.medianMonths} ay | Çalışmayan: ${agg.duration.notWorkingCount}`,
        agg.duration.answered,
        100,
      ])
    } else if (agg.kind === 'text') {
      for (const e of agg.text.entries) {
        wsDist.addRow([
          agg.question.id,
          agg.question.label[lang],
          `${e.graduateName} (${e.graduationYear ?? '—'}): ${e.text}`,
          1,
          '',
        ])
      }
    }
  }

  // 3. TEKİL YANITLAR
  const wsResp = workbook.addWorksheet(isEn ? 'Individual Responses' : 'Tekil Yanitlar')
  const nonLockedQuestions = definition.questions.filter((q) => !q.lockedFromProfile)
  const respHeaders: string[] = [
    isEn ? 'Period' : 'Dönem',
    isEn ? 'Submitted At' : 'Tarih',
    isEn ? 'Graduate Name' : 'Ad Soyad',
    isEn ? 'Email' : 'E-posta',
    isEn ? 'Student No' : 'Öğrenci No',
    isEn ? 'Grad Year' : 'Mezuniyet Yılı',
  ]
  for (const q of nonLockedQuestions) {
    if (q.type === 'matrix' && q.rows) {
      for (const r of q.rows) respHeaders.push(`${q.id}.${r.id} (${r[lang]})`)
    } else {
      respHeaders.push(q.label[lang])
    }
  }
  const respHeadRow = wsResp.addRow(respHeaders)
  styleHeaderRow(respHeadRow)
  wsResp.columns = respHeaders.map((h) => ({ width: Math.min(42, Math.max(16, h.length * 0.85)) }))

  for (const r of responses) {
    const line: (string | number)[] = [
      r.period_key,
      new Date(r.submitted_at).toLocaleString(isEn ? 'en-US' : 'tr-TR'),
      r.graduate_name,
      r.graduate_email,
      r.student_number,
      r.graduation_year ?? '',
    ]
    for (const q of nonLockedQuestions) {
      if (q.type === 'matrix' && q.rows) {
        const val = r.answers[q.id]
        const rec = val && typeof val === 'object' && !Array.isArray(val) ? (val as Record<string, string>) : null
        for (const mr of q.rows) {
          const pick = rec?.[mr.id]
          line.push(pick ? q.columns?.find((c) => c.value === pick)?.[lang] ?? pick : '—')
        }
      } else {
        line.push(formatAnswerLabel(q, r.answers[q.id], lang))
      }
    }
    wsResp.addRow(line)
  }

  // 4. KATILIM / BEKLEYEN LİSTESİ
  const wsGrad = workbook.addWorksheet(isEn ? 'Graduates Status' : 'Mezun Katilim Listesi')
  wsGrad.columns = [
    { width: 16 },
    { width: 28 },
    { width: 32 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 22 },
  ]
  const gHead = wsGrad.addRow([
    isEn ? 'Student No' : 'Öğrenci No',
    isEn ? 'Full Name' : 'Ad Soyad',
    isEn ? 'Email' : 'E-posta',
    isEn ? 'Grad Year' : 'Mezuniyet Yılı',
    isEn ? 'Term' : 'Dönem',
    isEn ? 'Status (Active Period)' : 'Durum (Aktif Dönem)',
    isEn ? 'Total Submissions' : 'Toplam Yanıt',
    isEn ? 'Latest Submission' : 'Son Gönderim',
  ])
  styleHeaderRow(gHead)

  for (const g of graduates) {
    wsGrad.addRow([
      g.student_number || '—',
      g.full_name,
      g.email,
      g.graduation_year ?? '—',
      g.graduation_term ?? '—',
      g.filled_active_period ? (isEn ? 'Completed' : 'Doldurdu') : isEn ? 'Pending' : 'Bekliyor',
      g.submitted_count,
      g.latest_submitted_at ? new Date(g.latest_submitted_at).toLocaleDateString(isEn ? 'en-US' : 'tr-TR') : '—',
    ])
  }

  const ab = await workbook.xlsx.writeBuffer()
  return Buffer.from(ab)
}
