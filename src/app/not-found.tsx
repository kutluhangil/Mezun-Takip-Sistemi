'use client'

import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { BackHome, PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export default function NotFound() {
  const { lang } = useUI()
  return (
    <PublicShell>
      <div className="reveal mx-auto max-w-[560px] px-4 pt-14 text-center sm:px-6">
        <Art name="empty" className="mx-auto size-44" />
        <p className="mt-6 font-mono text-[13px] tabular text-ink-3">404</p>
        <h1 className="serif mt-2 text-[34px] text-ink sm:text-[44px]">{t(lang, 'notFound.title')}</h1>
        <p className="mx-auto mt-3 max-w-[42ch] text-[16px] leading-relaxed text-ink-2">{t(lang, 'notFound.body')}</p>
        <div className="mt-8"><BackHome /></div>
      </div>
    </PublicShell>
  )
}
