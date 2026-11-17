import type { Metadata } from 'next'
import { getAppSettings } from '@/lib/server-data'
import { KvkkClient } from '@/components/landing/KvkkClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'KVKK Aydınlatma Metni' }

export default async function KvkkPage() {
  const { kvkkNotice } = await getAppSettings()
  return <KvkkClient notice={kvkkNotice} />
}
