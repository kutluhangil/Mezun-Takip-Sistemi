import { redirect } from 'next/navigation'
import { getAdminSession } from './auth'
import {
  getActiveSurvey,
  getAppSettings,
  getGraduatesWithStatus,
  getSubmittedResponses,
  listAdmins,
} from './server-data'

export async function requireAdminData() {
  const admin = await getAdminSession()
  if (!admin) {
    redirect('/admin/giris')
  }

  const survey = await getActiveSurvey()
  const [settings, responses, graduates, admins] = await Promise.all([
    getAppSettings(),
    getSubmittedResponses(survey.id),
    getGraduatesWithStatus(survey.id, survey.active_period),
    listAdmins(),
  ])

  return {
    admin,
    survey,
    settings,
    responses,
    graduates,
    admins,
  }
}
