import { getGraduateSession } from '@/lib/auth'
import { getActiveSurvey } from '@/lib/server-data'
import { LandingClient } from '@/components/landing/LandingClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let activePeriod = '2026-Guz'
  let isOpen = true
  let hasSession = false

  try {
    const [survey, grad] = await Promise.all([getActiveSurvey(), getGraduateSession()])
    activePeriod = survey.active_period
    isOpen = survey.is_open
    hasSession = Boolean(grad)
  } catch {
    // DB henüz başlatılmadıysa veya önizleme modundaysa varsayılan durumla aç
  }

  return <LandingClient activePeriod={activePeriod} isOpen={isOpen} hasSession={hasSession} />
}
