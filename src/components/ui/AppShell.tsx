'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ArrowUp, Monitor, Moon, Sun } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art, hasArt } from './Art'
import { useUI } from './UIProvider'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  /** Mobil alt menüde sığması için kısa ad */
  short?: string
}

function useActive() {
  const pathname = usePathname()
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`))
}

export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { lang } = useUI()
  const big = size === 'lg'
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Sitenin kendi logosu (Gemini, docs/GEMINI-GORSEL-PROMPTLARI.md §11) */}
      <Art name="logo" priority className={big ? 'size-11' : 'size-8'} />
      <span className="flex flex-col leading-none">
        <span className={`serif text-ink ${big ? 'text-[24px]' : 'text-[17px]'}`}>{t(lang, 'brand.short')}</span>
        {big && <span className="mt-1.5 text-[13px] text-ink-3">{t(lang, 'brand.uni')}</span>}
      </span>
    </span>
  )
}

const toolCls = 'grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink'

export function ToolButtons() {
  const { lang, toggleLang, theme, cycleTheme } = useUI()
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  return (
    <>
      <button type="button" onClick={toggleLang} className={`${toolCls} text-[12.5px] font-medium`} aria-label={t(lang, 'lang.aria')}>
        {lang === 'tr' ? 'EN' : 'TR'}
      </button>
      <button type="button" onClick={cycleTheme} className={toolCls} aria-label={t(lang, `theme.${theme}`)} title={t(lang, `theme.${theme}`)}>
        <ThemeIcon size={17} strokeWidth={1.75} />
      </button>
    </>
  )
}

export function TopBar({ items, right, home = '/' }: { items: NavItem[]; right?: React.ReactNode; home?: string }) {
  const isActive = useActive()
  const pathname = usePathname()
  const { lang } = useUI()
  const bar = useRef<HTMLElement>(null)
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const place = () => {
      const a = bar.current?.querySelector<HTMLElement>('a[aria-current="page"]')
      setInd(a ? { left: a.offsetLeft, width: a.offsetWidth } : null)
    }
    place()
    addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [pathname, lang, items.length])

  return (
    <header className="sticky top-0 z-40 bg-bg/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link href={home} className="justify-self-start rounded-md">
          <BrandMark />
        </Link>
        {items.length > 0 ? (
          <nav ref={bar} aria-label={t(lang, 'nav.main')} className="nav-pill hidden items-center rounded-full border border-line-2 bg-sunk/70 p-1 md:flex">
            {ind && <span className="indicator" style={{ left: ind.left, width: ind.width }} aria-hidden />}
            {items.map((item) => {
              const on = isActive(item)
              return (
                <Link key={item.href} href={item.href} aria-current={on ? 'page' : undefined}
                  className={`relative z-10 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] transition-colors ${on ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : (
          <span className="hidden md:block" />
        )}
        <div className="flex items-center gap-1 justify-self-end">
          <ToolButtons />
          {right}
        </div>
      </div>
    </header>
  )
}

/** Telefonda başparmak menüsü: altta sabit, ana ekran çubuğunun üstünde. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const isActive = useActive()
  const { lang } = useUI()
  return (
    <nav aria-label={t(lang, 'nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-2 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-[560px]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const on = isActive(item)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={on ? 'page' : undefined}
                className={`flex h-[62px] flex-col items-center justify-center gap-1 text-[10.5px] transition-colors ${on ? 'text-ink' : 'text-ink-3'}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-300 ${on ? 'bg-raised shadow-sm' : ''}`}>
                  <Icon size={19} strokeWidth={on ? 2 : 1.6} className={on ? 'text-clay' : ''} />
                </span>
                <span className="max-w-full truncate px-0.5">{item.short ?? item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Kâğıt footer: temayla birlikte döner (açıkta koyu fildişi, koyuda kömür). Üstte footer'ı boydan boya saran
 * gravür bandı (`footer.webp`), altında marka, bağlantılar ve künye. Telefonda alt menünün altında kalmaz.
 */
export function SiteFooter() {
  const { lang } = useUI()
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: t(lang, 'foot.graduates'),
      links: [
        { label: t(lang, 'nav.home'), href: '/' },
        { label: t(lang, 'land.cta'), href: '/giris' },
        { label: t(lang, 'foot.faq'), href: '/#sss' },
      ],
    },
    {
      title: t(lang, 'foot.program'),
      links: [
        { label: t(lang, 'land.adminLink'), href: '/admin/giris' },
        { label: t(lang, 'foot.kvkk'), href: '/kvkk' },
      ],
    },
  ]
  const banner = hasArt('footer')
  return (
    <footer className="mt-28 border-t border-line-2 bg-sunk/60 pb-[calc(62px+env(safe-area-inset-bottom))] md:pb-0">
      {banner ? (
        <Art name="footer" className="footer-band mx-auto w-full max-w-[1180px] px-4 pt-10 sm:px-6" />
      ) : (
        <div className="ornament pt-12"><Art name="ornament" className="h-6 w-24" /></div>
      )}
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-6 gap-y-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
        <div className="col-span-2 lg:col-span-1">
          <BrandMark size="lg" />
          <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-ink-2">{t(lang, 'foot.tagline')}</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{c.title}</h2>
            <ul className="mt-4 space-y-1">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-[40px] items-center text-[15px] text-ink-2 transition-colors hover:text-clay">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line-2">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-6 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {t(lang, 'brand.uni')} · {t(lang, 'brand.unit')}</p>
          <a href="#top" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="inline-flex items-center gap-1.5 self-start rounded-full py-1 transition-colors hover:text-ink sm:self-auto">
            <ArrowUp size={14} strokeWidth={1.75} />
            {t(lang, 'foot.top')}
          </a>
        </div>
      </div>
    </footer>
  )
}

export function Section({ title, kicker, children, wide = false, id }: { title: string; kicker?: string; children: React.ReactNode; wide?: boolean; id?: string }) {
  return (
    <section id={id} className={`mx-auto mt-24 scroll-mt-24 px-4 sm:mt-28 sm:px-6 ${wide ? 'max-w-[1080px]' : 'max-w-[860px]'}`}>
      <div className="ornament"><Art name="ornament" className="h-6 w-24" /></div>
      {kicker && <p className="mt-5 text-center text-[13.5px] text-ink-3">{kicker}</p>}
      <h2 className={`serif text-center text-[30px] leading-tight text-ink sm:text-[38px] ${kicker ? 'mt-2' : 'mt-5'}`}>{title}</h2>
      <div className="mt-10">{children}</div>
    </section>
  )
}

export function PageHeader({ kicker, title, lede, actions }: { kicker?: React.ReactNode; title: string; lede?: string; actions?: React.ReactNode }) {
  return (
    <div className="reveal flex flex-col gap-5 pt-10 sm:pt-14 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {kicker && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-3">{kicker}</div>}
        <h1 className="serif mt-3 text-[34px] leading-[1.08] text-ink sm:text-[46px]">{title}</h1>
        {lede && <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Sakin kâğıt kartı */
export function Card({ children, className = '', as: Tag = 'div' }: { children: React.ReactNode; className?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  return <Tag className={`rounded-2xl border border-line-2 bg-raised/60 backdrop-blur-sm ${className}`}>{children}</Tag>
}

export const btn = {
  primary: 'enter-btn inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-ink px-6 text-[15.5px] font-medium text-bg',
  secondary: 'inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-line bg-raised/60 px-6 text-[15.5px] text-ink transition-colors hover:border-ink-3 disabled:opacity-50',
  small: 'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-raised/60 px-4 text-[14px] text-ink transition-colors hover:border-ink-3 disabled:opacity-50',
  smallPrimary: 'enter-btn inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[14px] font-medium text-bg',
  ghost: 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-[14px] text-ink-2 transition-colors hover:bg-sunk hover:text-ink',
  danger: 'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-danger/40 px-4 text-[14px] text-danger transition-colors hover:bg-danger/10 disabled:opacity-50',
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error' | 'ok'; children: React.ReactNode }) {
  const cls = {
    info: 'border-line bg-sunk/70 text-ink-2',
    warn: 'border-clay/40 bg-band/30 text-ink',
    error: 'border-danger/40 bg-danger/10 text-danger',
    ok: 'border-sage/40 bg-sage/10 text-ink',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-[14.5px] leading-relaxed ${cls}`}>
      {children}
    </div>
  )
}
