'use client'

import Link from 'next/link'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { btn } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function ThanksClient({ period, submissionNumber }: { period: string; submissionNumber: string }) {
  const { lang } = useUI()
  const date = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const rows = [
    [t(lang, 'thanks.periodLabel'), period],
    [t(lang, 'thanks.dateLabel'), date],
    [t(lang, 'thanks.submissionNo'), `#${submissionNumber}`],
  ]
  return (
    <PublicShell signedIn>
      <div className="reveal mx-auto max-w-[620px] px-4 pt-10 text-center sm:px-6 sm:pt-16">
        <Art name="thanks" priority className="art-in mx-auto size-44 sm:size-52" />
        <h1 className="serif mt-6 text-[38px] leading-tight text-ink sm:text-[52px]">{t(lang, 'thanks.title')}</h1>
        <p className="mx-auto mt-4 max-w-[48ch] text-[16.5px] leading-relaxed text-ink-2">{t(lang, 'thanks.subtitle')}</p>
        <dl className="mx-auto mt-10 max-w-[420px] divide-y divide-line-2 border-y border-line-2 text-left">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5">
              <dt className="text-[14px] text-ink-3">{k}</dt>
              <dd className="tabular text-[15px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mx-auto mt-6 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">{t(lang, 'thanks.note')}</p>
        <Link href="/" className={`${btn.secondary} mt-8`}>{t(lang, 'thanks.backHome')}</Link>
      </div>
    </PublicShell>
  )
}
