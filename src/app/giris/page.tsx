import { redirect } from 'next/navigation'
import { getGraduateSession } from '@/lib/auth'
import { getAppSettings } from '@/lib/server-data'
import { GraduateLoginClient } from '@/components/auth/GraduateLoginClient'

export const dynamic = 'force-dynamic'

export default async function GraduateLoginPage() {
  let kvkkTr = ''
  let kvkkEn = ''

  try {
    const grad = await getGraduateSession()
    if (grad) {
      redirect('/anket')
    }
    const settings = await getAppSettings()
    kvkkTr = settings.kvkkNotice.tr
    kvkkEn = settings.kvkkNotice.en
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err
    }
  }

  const showDemoLogin = process.env.NODE_ENV !== 'production'
  return <GraduateLoginClient kvkkTextTr={kvkkTr} kvkkTextEn={kvkkEn} showDemoLogin={showDemoLogin} />
}
