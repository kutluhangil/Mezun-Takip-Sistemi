import { redirect } from 'next/navigation'
import { getAdminSession } from './auth'
import { query } from './db'
import { getActiveSurvey, getSubmittedResponses } from './server-data'
import type { AdminUser, SubmittedResponseItem, SurveyRow } from './survey-types'

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminSession()
  if (!admin) redirect('/admin/giris')
  return admin
}

/** Analiz ekranları kimlik bilgisine ihtiyaç duymaz; ad/e-posta/öğrenci no tarayıcıya hiç gönderilmez. */
export function stripIdentity(responses: SubmittedResponseItem[]): SubmittedResponseItem[] {
  return responses.map((r) => {
    const answers = { ...r.answers }
    delete answers.q_full_name
    delete answers.q_email
    delete answers.q_student_number
    return { ...r, graduate_email: '', graduate_name: '', student_number: '', answers }
  })
}

export async function loadAnalytics(): Promise<{
  admin: AdminUser
  survey: SurveyRow
  responses: SubmittedResponseItem[]
  totalGraduates: number
}> {
  const admin = await requireAdmin()
  const survey = await getActiveSurvey()
  const [responses, totalGraduates] = await Promise.all([getSubmittedResponses(survey.id), countGraduates()])
  return { admin, survey, responses: stripIdentity(responses), totalGraduates }
}

export async function countGraduates(): Promise<number> {
  const res = await query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM graduates WHERE anonymized_at IS NULL`)
  return res.rows[0]?.c ?? 0
}
