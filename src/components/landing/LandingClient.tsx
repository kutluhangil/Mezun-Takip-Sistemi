'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Lock } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { BrandLogo } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function LandingClient({
  activePeriod,
  isOpen,
  hasSession,
}: {
  activePeriod: string
  isOpen: boolean
  hasSession: boolean
}) {
  const { lang } = useUI()

  return (
    <PublicShell graduateEmail={hasSession ? 'active' : undefined}>
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-14 sm:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="reveal">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <BrandLogo />
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised/80 px-3.5 py-1.5 text-xs font-medium text-ink-2">
                <span className={isOpen ? 'live-dot' : 'size-2 rounded-full bg-ink-3'} />
                <span className="tabular">
                  {t(lang, 'survey.periodTag')} {activePeriod}
                </span>
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-ink">
              {t(lang, 'land.kicker')}
            </p>

            <h1 className="serif mt-3 text-[clamp(36px,5.6vw,64px)] leading-[1.04] font-normal text-ink">
              {t(lang, 'land.title')}
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-ink-2">
              {t(lang, 'land.lede')}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={hasSession ? '/anket' : '/giris'}
                className="enter-btn inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-base font-medium text-bg shadow-sm hover:opacity-95"
              >
                <span>{t(lang, 'land.cta')}</span>
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/admin/giris"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-line bg-raised/75 px-6 text-sm font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
              >
                <Lock className="size-4" />
                <span>{t(lang, 'land.adminLink')}</span>
              </Link>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-ink-3">{t(lang, 'land.ctaHint')}</p>
          </div>

          <div className="enter flex justify-center lg:justify-end">
            <div className="relative flex flex-col items-center rounded-3xl border border-line-2 bg-raised/65 p-6 sm:p-8 shadow-[var(--shadow)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/fbu-campus.png"
                alt={t(lang, 'brand.uni')}
                width={280}
                height={280}
                className="h-auto w-[240px] sm:w-[272px] object-contain"
              />
              <div className="mt-3 w-full border-t border-line-2 pt-3 text-center">
                <p className="serif text-sm font-medium text-ink">{t(lang, 'brand.title')}</p>
                <p className="mt-0.5 text-xs text-ink-3">{t(lang, 'brand.uni')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="ornament">
          <Art name="ornament" />
        </div>
        <h2 className="serif mt-4 text-center text-2xl sm:text-3xl font-normal text-ink">
          {t(lang, 'land.howTitle')}
        </h2>

        <div className="reveal mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: t(lang, 'land.step1Title'), body: t(lang, 'land.step1Body') },
            { title: t(lang, 'land.step2Title'), body: t(lang, 'land.step2Body') },
            { title: t(lang, 'land.step3Title'), body: t(lang, 'land.step3Body') },
          ].map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-line-2 bg-raised/75 p-6 transition-colors hover:border-line"
            >
              <h3 className="serif text-xl font-medium text-ink">{step.title}</h3>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  )
}
