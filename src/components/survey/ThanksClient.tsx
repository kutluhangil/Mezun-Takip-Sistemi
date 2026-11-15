'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function ThanksClient({
  period,
  submissionNumber,
  submittedDate,
}: {
  period: string
  submissionNumber: string
  submittedDate: string
}) {
  const { lang } = useUI()

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="enter rounded-3xl border border-line-2 bg-raised/90 p-6 sm:p-10 text-center shadow-[var(--shadow)]">
          <div className="flex justify-center">
            <Art name="thanks" size={200} />
          </div>

          <h1 className="serif mt-2 text-3xl sm:text-4xl font-normal text-ink">
            {t(lang, 'thanks.title')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-2">{t(lang, 'thanks.subtitle')}</p>

          <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl border border-line-2 bg-surface p-4 text-left">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-3">{t(lang, 'thanks.periodLabel')}</p>
              <p className="mt-0.5 text-sm font-semibold tabular text-ink">{period}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-3">{t(lang, 'thanks.submissionNo')}</p>
              <p className="mt-0.5 text-sm font-semibold tabular text-ink">#{submissionNumber}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-ink-3">{t(lang, 'thanks.dateLabel')}</p>
              <p className="mt-0.5 text-sm font-semibold tabular text-ink">{submittedDate}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="enter-btn inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-bg"
            >
              <ArrowLeft className="size-4" />
              <span>{t(lang, 'thanks.backHome')}</span>
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
