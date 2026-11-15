import { NextResponse } from 'next/server'
import { aggregateSurvey, computeCrossTab, filterResponses, type FilterCriteria } from '@/lib/aggregate'
import { getAdminSession } from '@/lib/auth'
import {
  getActiveSurvey,
  getAppSettings,
  getGraduatesWithStatus,
  getSubmittedResponses,
  listAdmins,
} from '@/lib/server-data'
import type { Lang } from '@/lib/survey-types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const lang: Lang = url.searchParams.get('lang') === 'en' ? 'en' : 'tr'
  const filters: FilterCriteria = {
    period: url.searchParams.get('period') || 'all',
    graduationYear: url.searchParams.get('year') || 'all',
    graduationTerm: url.searchParams.get('term') || 'all',
    workStatus: url.searchParams.get('workStatus') || 'all',
  }
  const crossRowId = url.searchParams.get('crossRow') || 'q_grad_year'
  const crossColId = url.searchParams.get('crossCol') || 'q_work_status'

  const survey = await getActiveSurvey()
  const [settings, allResponses, graduates, admins] = await Promise.all([
    getAppSettings(),
    getSubmittedResponses(survey.id),
    getGraduatesWithStatus(survey.id, survey.active_period),
    listAdmins(),
  ])

  const filtered = filterResponses(allResponses, filters)
  const summary = aggregateSurvey({
    definition: survey.definition,
    responses: filtered,
    allResponsesForFacets: allResponses,
    totalGraduatesInWhitelist: graduates.length,
    lang,
  })

  const rowQuestion =
    survey.definition.questions.find((q) => q.id === crossRowId) ??
    survey.definition.questions.find((q) => q.id === 'q_grad_year')
  const colQuestion =
    survey.definition.questions.find((q) => q.id === crossColId) ??
    survey.definition.questions.find((q) => q.id === 'q_work_status')

  const crossTab =
    rowQuestion && colQuestion
      ? computeCrossTab({ rowQuestion, colQuestion, responses: filtered, lang })
      : null

  return NextResponse.json({
    admin,
    surveyMeta: {
      id: survey.id,
      slug: survey.slug,
      is_open: survey.is_open,
      repeat_mode: survey.repeat_mode,
      active_period: survey.active_period,
      cooldown_days: survey.cooldown_days,
    },
    definition: survey.definition,
    settings,
    summary,
    crossTab,
    responses: filtered,
    graduates,
    admins,
  })
}
