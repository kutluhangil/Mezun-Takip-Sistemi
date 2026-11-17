'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarChart3, ClipboardList, FileDown, Home, LayoutGrid, ListChecks, LogIn, LogOut, Settings, Users } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { AdminUser } from '@/lib/survey-types'
import { btn, MobileNav, SiteFooter, TopBar, type NavItem } from './AppShell'
import { useUI } from './UIProvider'

/**
 * Mezun tarafı kabuğu. `focus` kipinde (anket doldurma) alt menü ve footer gizlenir,
 * yerine sayfanın kendi sabit İleri/Geri çubuğu gelir.
 */
export function PublicShell({
  children,
  signedIn = false,
  focus = false,
}: {
  children: React.ReactNode
  signedIn?: boolean
  focus?: boolean
}) {
  const { lang } = useUI()
  const router = useRouter()

  const items: NavItem[] = [
    { href: '/', label: t(lang, 'nav.home'), icon: Home, exact: true },
    { href: signedIn ? '/anket' : '/giris', label: t(lang, 'nav.survey'), icon: ClipboardList },
    { href: '/admin/giris', label: t(lang, 'nav.teacher'), icon: LogIn },
  ]

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="app-paper flex min-h-dvh flex-col">
      <TopBar
        items={focus ? [] : items}
        right={
          signedIn ? (
            <button type="button" onClick={logout} className="grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
              aria-label={t(lang, 'survey.signOut')} title={t(lang, 'survey.signOut')}>
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          ) : undefined
        }
      />
      <main className={`flex-1 ${focus ? 'pb-36' : ''}`}>{children}</main>
      {!focus && <SiteFooter />}
      {!focus && <MobileNav items={items} />}
    </div>
  )
}

export function AdminShell({ children, admin }: { children: React.ReactNode; admin: AdminUser }) {
  const { lang } = useUI()
  const router = useRouter()

  const items: NavItem[] = [
    { href: '/admin', label: t(lang, 'nav.overview'), short: t(lang, 'nav.overviewShort'), icon: LayoutGrid, exact: true },
    { href: '/admin/analiz', label: t(lang, 'nav.analytics'), short: t(lang, 'nav.analyticsShort'), icon: BarChart3 },
    { href: '/admin/yanitlar', label: t(lang, 'nav.responses'), icon: ListChecks },
    { href: '/admin/mezunlar', label: t(lang, 'nav.graduates'), icon: Users },
    { href: '/admin/rapor', label: t(lang, 'nav.reports'), icon: FileDown },
    { href: '/admin/ayarlar', label: t(lang, 'nav.settings'), icon: Settings },
  ]

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/giris')
    router.refresh()
  }

  return (
    <div className="app-paper flex min-h-dvh flex-col">
      <TopBar
        items={items}
        home="/admin"
        right={
          <>
            <span className="ml-1 hidden items-center gap-2 text-[13px] text-ink-2 xl:inline-flex" title={admin.email}>
              <span className={`size-2 rounded-full ${admin.role === 'owner' ? 'bg-clay' : 'bg-sage'}`} />
              {admin.full_name}
            </span>
            <button type="button" onClick={logout} className="grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
              aria-label={t(lang, 'admin.logout')} title={t(lang, 'admin.logout')}>
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-[calc(84px+env(safe-area-inset-bottom))] sm:px-6 md:pb-16">{children}</main>
      <MobileNav items={items} />
    </div>
  )
}

export function BackHome() {
  const { lang } = useUI()
  return (
    <Link href="/" className={btn.secondary}>
      {t(lang, 'notFound.home')}
    </Link>
  )
}
