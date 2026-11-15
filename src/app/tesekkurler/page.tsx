import { ThanksClient } from '@/components/survey/ThanksClient'

export const dynamic = 'force-dynamic'

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; n?: string }>
}) {
  const sp = await searchParams
  const period = sp.period || '2026-Guz'
  const submissionNumber = sp.n || '1'
  const submittedDate = new Date().toLocaleDateString('tr-TR')

  return <ThanksClient period={period} submissionNumber={submissionNumber} submittedDate={submittedDate} />
}
