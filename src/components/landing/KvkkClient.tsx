'use client'

import { t } from '@/lib/i18n'
import type { KvkkNoticeSetting } from '@/lib/server-data'
import { Art } from '@/components/ui/Art'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function KvkkClient({ notice }: { notice: KvkkNoticeSetting }) {
  const { lang } = useUI()
  const text = notice[lang] || notice.tr
  return (
    <PublicShell>
      <article className="mx-auto max-w-[720px] px-4 pt-10 sm:px-6 sm:pt-14">
        <header className="reveal text-center">
          <Art name="privacy" className="mx-auto size-28" />
          <p className="mt-5 text-[13.5px] text-ink-3">{t(lang, 'kvkk.version')} <span className="font-mono">{notice.version}</span></p>
          <h1 className="serif mt-2 text-[34px] leading-tight text-ink sm:text-[46px]">{t(lang, 'foot.kvkk')}</h1>
        </header>
        <div className="enter mt-10 whitespace-pre-line text-[16px] leading-[1.75] text-ink-2">{text}</div>
      </article>
    </PublicShell>
  )
}
