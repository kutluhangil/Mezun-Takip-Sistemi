import { ThanksClient } from '@/components/survey/ThanksClient'

export const dynamic = 'force-dynamic'

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ period?: string; n?: string }> }) {
  const sp = await searchParams
  const period = (sp.period || '—').slice(0, 32)
  const n = /^\d{1,3}$/.test(sp.n ?? '') ? sp.n! : '1'
  return <ThanksClient period={period} submissionNumber={n} />
}
