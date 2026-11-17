import { redirect } from 'next/navigation'
import { getGraduateSession } from '@/lib/auth'
import { getAppSettings } from '@/lib/server-data'
import { GraduateLoginClient } from '@/components/auth/GraduateLoginClient'

export const dynamic = 'force-dynamic'

export default async function GraduateLoginPage() {
  if (await getGraduateSession().catch(() => null)) redirect('/anket')
  const settings = await getAppSettings().catch(() => null)
  return <GraduateLoginClient kvkkTextTr={settings?.kvkkNotice.tr ?? ''} kvkkTextEn={settings?.kvkkNotice.en ?? ''} />
}
