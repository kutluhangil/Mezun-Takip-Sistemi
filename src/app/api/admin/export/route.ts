import { aggregateSurvey, filterResponses, type FilterCriteria } from '@/lib/aggregate'
import { audit } from '@/lib/audit'
import { getAdminSession } from '@/lib/auth'
import { generateCsvExport } from '@/lib/exports/csv'
import { generateDocxReport } from '@/lib/exports/docx-report'
import { generateExcelExport } from '@/lib/exports/excel'
import { generatePdfReport } from '@/lib/exports/pdf-report'
import { clientIp, jsonError } from '@/lib/http'
import { getActiveSurvey, getGraduatesWithStatus, getLogoBuffer, getSubmittedResponses } from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FORMATS = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const
type Format = keyof typeof FORMATS

function buildFilterLabel(filters: FilterCriteria, lang: Lang): string {
  const en = lang === 'en'
  const parts: string[] = []
  if (filters.period && filters.period !== 'all') parts.push(`${en ? 'Period' : 'Dönem'}: ${filters.period}`)
  if (filters.graduationYear && filters.graduationYear !== 'all') parts.push(`${en ? 'Year' : 'Yıl'}: ${filters.graduationYear}`)
  if (filters.graduationTerm && filters.graduationTerm !== 'all') parts.push(`${en ? 'Term' : 'Dönem'}: ${filters.graduationTerm}`)
  if (filters.workStatus && filters.workStatus !== 'all') parts.push(`${en ? 'Status' : 'Durum'}: ${filters.workStatus}`)
  return parts.length > 0 ? parts.join(' · ') : en ? 'All Records' : 'Tüm Kayıtlar'
}

const param = (url: URL, key: string) => (url.searchParams.get(key) || 'all').slice(0, 64)

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return jsonError(401, 'unauthorized')

  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'xlsx').toLowerCase()
  if (!(format in FORMATS)) return jsonError(400, 'Unsupported format')
  const lang: Lang = url.searchParams.get('lang') === 'en' ? 'en' : 'tr'
  const anonymous = url.searchParams.get('anonymous') === '1'
  const filters: FilterCriteria = {
    period: param(url, 'period'),
    graduationYear: param(url, 'year'),
    graduationTerm: param(url, 'term'),
    workStatus: param(url, 'workStatus'),
  }

  try {
    const survey = await getActiveSurvey()
    const [allResponses, graduates] = await Promise.all([
      getSubmittedResponses(survey.id),
      getGraduatesWithStatus(survey.id, survey.active_period),
    ])
    const filtered = filterResponses(allResponses, filters)
    const summary = aggregateSurvey({
      definition: survey.definition,
      responses: filtered,
      allResponsesForFacets: allResponses,
      totalGraduatesInWhitelist: graduates.length,
      lang,
    })
    const filterLabel = buildFilterLabel(filters, lang)

    let buf: Buffer
    switch (format as Format) {
      case 'csv':
        buf = generateCsvExport({ definition: survey.definition, responses: filtered, lang, anonymous })
        break
      case 'xlsx':
        buf = await generateExcelExport({
          definition: survey.definition,
          summary,
          responses: filtered,
          graduates,
          filterLabel,
          lang,
          anonymous,
        })
        break
      case 'docx':
        buf = await generateDocxReport({ summary, filterLabel, lang, logoBuffer: getLogoBuffer() })
        break
      case 'pdf':
        buf = await generatePdfReport({ summary, filterLabel, lang, logoBuffer: getLogoBuffer() })
        break
    }

    await audit(admin.id, 'export.download', {
      ip: clientIp(req),
      detail: { format, lang, anonymous, filters, rows: filtered.length },
    })

    const stamp = new Date().toISOString().slice(0, 10)
    const name = `fbu-ilk-acil-yardim-mezun-${stamp}-${lang}${anonymous ? '-anonim' : ''}.${format}`
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': FORMATS[format as Format],
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[admin/export]', err)
    return jsonError(500, 'Dışa aktarma oluşturulamadı.')
  }
}
