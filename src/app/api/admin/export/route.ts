import { NextResponse } from 'next/server'
import { aggregateSurvey, filterResponses, type FilterCriteria } from '@/lib/aggregate'
import { getAdminSession } from '@/lib/auth'
import { generateCsvExport } from '@/lib/exports/csv'
import { generateDocxReport } from '@/lib/exports/docx-report'
import { generateExcelExport } from '@/lib/exports/excel'
import { generatePdfReport } from '@/lib/exports/pdf-report'
import {
  getActiveSurvey,
  getGraduatesWithStatus,
  getLogoBuffer,
  getSubmittedResponses,
} from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

function buildFilterLabel(filters: FilterCriteria, lang: Lang): string {
  const parts: string[] = []
  if (filters.period && filters.period !== 'all') parts.push(`${lang === 'en' ? 'Period' : 'Dönem'}: ${filters.period}`)
  if (filters.graduationYear && filters.graduationYear !== 'all') parts.push(`${lang === 'en' ? 'Year' : 'Yıl'}: ${filters.graduationYear}`)
  if (filters.graduationTerm && filters.graduationTerm !== 'all') parts.push(`${lang === 'en' ? 'Term' : 'Dönem'}: ${filters.graduationTerm}`)
  if (filters.workStatus && filters.workStatus !== 'all') parts.push(`${lang === 'en' ? 'Status' : 'Durum'}: ${filters.workStatus}`)
  return parts.length > 0 ? parts.join(' · ') : lang === 'en' ? 'All Records' : 'Tüm Kayıtlar'
}

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const format = (url.searchParams.get('format') || 'xlsx').toLowerCase()
  const lang: Lang = url.searchParams.get('lang') === 'en' ? 'en' : 'tr'
  const filters: FilterCriteria = {
    period: url.searchParams.get('period') || 'all',
    graduationYear: url.searchParams.get('year') || 'all',
    graduationTerm: url.searchParams.get('term') || 'all',
    workStatus: url.searchParams.get('workStatus') || 'all',
  }

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
  const stamp = new Date().toISOString().slice(0, 10)
  const baseName = `fbu-ilk-acil-yardim-mezun-${stamp}-${lang}`

  if (format === 'csv') {
    const buf = generateCsvExport({ definition: survey.definition, responses: filtered, lang })
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.csv"`,
      },
    })
  }

  if (format === 'xlsx') {
    const buf = await generateExcelExport({
      definition: survey.definition,
      summary,
      responses: filtered,
      graduates,
      filterLabel,
      lang,
    })
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
      },
    })
  }

  if (format === 'docx') {
    const buf = await generateDocxReport({
      summary,
      filterLabel,
      lang,
      logoBuffer: getLogoBuffer(),
    })
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${baseName}.docx"`,
      },
    })
  }

  if (format === 'pdf') {
    const buf = await generatePdfReport({
      summary,
      filterLabel,
      lang,
      logoBuffer: getLogoBuffer(),
    })
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
}
