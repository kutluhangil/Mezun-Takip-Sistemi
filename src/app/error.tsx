'use client'

import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { btn } from '@/components/ui/AppShell'
import { BackHome, PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useUI()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <PublicShell>
      <div className="reveal mx-auto max-w-[560px] px-4 pt-14 text-center sm:px-6">
        <Art name="offline" className="mx-auto size-44" />
        <h1 className="serif mt-6 text-[34px] text-ink sm:text-[44px]">{t(lang, 'error.title')}</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">{t(lang, 'error.body')}</p>
        {error.digest && <p className="mt-3 font-mono text-[12px] text-ink-3">{error.digest}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={btn.primary}><RotateCcw size={16} />{t(lang, 'error.retry')}</button>
          <BackHome />
        </div>
      </div>
    </PublicShell>
  )
}
