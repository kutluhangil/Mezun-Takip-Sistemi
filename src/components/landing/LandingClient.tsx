'use client'

import Link from 'next/link'
import { ArrowRight, ChevronDown, LockKeyhole } from 'lucide-react'
import { t, type I18nKey } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { btn, Card, Section } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

const STEPS = [1, 2, 3] as const
const WHY = [1, 2, 3] as const
const FAQ = [1, 2, 3, 4, 5] as const

export function LandingClient({ activePeriod, isOpen, hasSession }: { activePeriod: string; isOpen: boolean; hasSession: boolean }) {
  const { lang } = useUI()
  const k = (key: string) => t(lang, key as I18nKey)

  return (
    <PublicShell signedIn={hasSession}>
      <section className="reveal mx-auto max-w-[780px] px-4 pt-10 text-center sm:px-6 sm:pt-14">
        <Art name="hero" priority className="art-in mx-auto size-[200px] sm:size-[260px]" />
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13.5px] text-ink-3">
          <span className="inline-flex items-center gap-2 text-ink-2">
            {isOpen ? <span className="live-dot" /> : <span className="size-2 rounded-full bg-ink-3" />}
            {t(lang, isOpen ? 'land.open' : 'land.closed')}
          </span>
          <span>{t(lang, 'survey.periodTag')} <span className="tabular text-ink-2">{activePeriod}</span></span>
        </p>
        <h1 className="serif mt-4 text-[44px] leading-[1.04] text-ink sm:text-[66px]">{t(lang, 'land.title')}</h1>
        <p className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-[1.65] text-ink-2 sm:text-[18px]">{t(lang, 'land.lede')}</p>
        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href={hasSession ? '/anket' : '/giris'} className={btn.primary}>
            {t(lang, hasSession ? 'land.continue' : 'land.cta')}
            <ArrowRight size={17} strokeWidth={1.75} />
          </Link>
          <Link href="/admin/giris" className={btn.secondary}>
            <LockKeyhole size={16} strokeWidth={1.75} />
            {t(lang, 'land.adminLink')}
          </Link>
        </div>
        <p className="mx-auto mt-5 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-3">{t(lang, 'land.ctaHint')}</p>
      </section>

      <Section title={t(lang, 'land.howTitle')} kicker={t(lang, 'land.howKicker')}>
        <ol>
          {STEPS.map((n, i) => (
            <li key={n} className={i ? 'border-t border-line-2' : ''}>
              {/* Numara başlıkla aynı satırda ortalanır, açıklama başlığın hizasından devam eder */}
              <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 px-1 py-6 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-x-6">
                <span className="serif tabular self-center text-[34px] leading-none text-clay sm:text-[40px]" aria-hidden>{n}</span>
                <h3 className="serif self-center text-[21px] leading-snug text-ink">{k(`land.step${n}Title`)}</h3>
                <p className="col-start-2 mt-2 text-[15.5px] leading-relaxed text-ink-2">{k(`land.step${n}Body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t(lang, 'land.whyTitle')} wide>
        <ul className="grid gap-4 sm:grid-cols-3">
          {WHY.map((n) => (
            <Card as="li" key={n} className="p-6">
              <span className="text-[13px] text-ink-3">{k(`land.why${n}Kicker`)}</span>
              <span className="serif mt-3 block text-[21px] leading-snug text-ink">{k(`land.why${n}Title`)}</span>
              <span className="mt-2 block text-[15px] leading-relaxed text-ink-2">{k(`land.why${n}Body`)}</span>
            </Card>
          ))}
        </ul>
      </Section>

      <Section id="sss" title={t(lang, 'land.faqTitle')}>
        <div className="divide-y divide-line-2 border-y border-line-2">
          {FAQ.map((n) => (
            <details key={n} className="group">
              <summary className="flex min-h-[60px] items-center justify-between gap-4 py-4 text-left">
                <span className="serif text-[18.5px] leading-snug text-ink">{k(`faq.q${n}`)}</span>
                <ChevronDown size={18} strokeWidth={1.75} className="chev shrink-0 text-ink-3 transition-transform" />
              </summary>
              <p className="pb-5 pr-8 text-[15.5px] leading-relaxed text-ink-2">{k(`faq.a${n}`)}</p>
            </details>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link href={hasSession ? '/anket' : '/giris'} className={btn.primary}>
            {t(lang, hasSession ? 'land.continue' : 'land.cta')}
            <ArrowRight size={17} strokeWidth={1.75} />
          </Link>
        </div>
      </Section>
    </PublicShell>
  )
}
