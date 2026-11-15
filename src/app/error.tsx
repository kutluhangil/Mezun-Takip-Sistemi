'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Art } from '@/components/ui/Art'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { t } from '@/lib/i18n'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { lang } = useUI()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
        <Art name="offline" size={180} />
        <h1 className="serif mt-5 text-3xl font-normal text-ink">{t(lang, 'error.title')}</h1>
        <p className="mt-2 text-sm text-ink-2">{t(lang, 'error.body')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-bg"
          >
            {t(lang, 'error.retry')}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-raised px-6 text-sm font-medium text-ink-2 hover:text-ink"
          >
            {t(lang, 'notFound.home')}
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
