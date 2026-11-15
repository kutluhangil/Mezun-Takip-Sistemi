'use client'

import Link from 'next/link'
import { Art } from '@/components/ui/Art'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { t } from '@/lib/i18n'

export default function NotFound() {
  const { lang } = useUI()

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
        <Art name="offline" size={180} />
        <h1 className="serif mt-5 text-3xl font-normal text-ink">{t(lang, 'notFound.title')}</h1>
        <p className="mt-2 text-sm text-ink-2">{t(lang, 'notFound.body')}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-bg">
          {t(lang, 'notFound.home')}
        </Link>
      </section>
    </PublicShell>
  )
}
