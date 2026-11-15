'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { t } from '@/lib/i18n'
import { SiteFooter, TopNav, type NavItem } from './AppShell'
import { useUI } from './UIProvider'

export function PublicShell({
  children,
  hideMobileNav = false,
  graduateEmail,
}: {
  children: React.ReactNode
  hideMobileNav?: boolean
  graduateEmail?: string
}) {
  const { lang } = useUI()
  const router = useRouter()

  const items: NavItem[] = [
    { href: '/', label: t(lang, 'nav.home'), icon: 'home', exact: true },
    { href: graduateEmail ? '/anket' : '/giris', label: t(lang, 'nav.survey'), icon: 'survey' },
    { href: '/admin', label: t(lang, 'nav.admin'), icon: 'admin' },
  ]

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/giris')
    router.refresh()
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <TopNav
        items={items}
        hideMobileNav={hideMobileNav}
        rightSlot={
          graduateEmail ? (
            <button
              type="button"
              onClick={handleLogout}
              title={t(lang, 'survey.signOut')}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-raised/80 px-3 text-xs font-medium text-ink-2 hover:border-ink-3 hover:text-ink"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">{t(lang, 'survey.signOut')}</span>
            </button>
          ) : undefined
        }
      />
      <main className={`flex-1 ${hideMobileNav ? 'pb-28' : 'pb-24 md:pb-0'}`}>{children}</main>
      {!hideMobileNav && <SiteFooter />}
    </div>
  )
}

export function AdminShell({
  children,
  adminName,
  adminRole,
}: {
  children: React.ReactNode
  adminName?: string
  adminRole?: 'owner' | 'viewer'
}) {
  const { lang } = useUI()
  const router = useRouter()

  const items: NavItem[] = [
    { href: '/admin', label: t(lang, 'nav.overview'), icon: 'overview', exact: true },
    { href: '/admin/analiz', label: t(lang, 'nav.analytics'), icon: 'analytics' },
    { href: '/admin/yanitlar', label: t(lang, 'nav.responses'), icon: 'responses' },
    { href: '/admin/mezunlar', label: t(lang, 'nav.graduates'), icon: 'graduates' },
    { href: '/admin/rapor', label: t(lang, 'nav.reports'), icon: 'reports' },
  ]

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/giris')
    router.refresh()
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <TopNav
        items={items}
        rightSlot={
          <div className="flex items-center gap-2">
            {adminRole && (
              <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-line bg-sunk px-3 py-1 text-xs font-medium text-ink-2">
                <span className={`size-2 rounded-full ${adminRole === 'owner' ? 'bg-clay' : 'bg-sage'}`} />
                {adminName ? `${adminName} · ` : ''}
                {t(lang, adminRole === 'owner' ? 'admin.roleOwner' : 'admin.roleViewer')}
              </span>
            )}
            <Link
              href="/giris"
              className="hidden sm:inline-flex h-10 items-center rounded-full border border-line bg-raised/70 px-3 text-xs font-medium text-ink-2 hover:text-ink"
            >
              {t(lang, 'nav.survey')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-raised/80 px-3 text-xs font-medium text-ink-2 hover:border-danger hover:text-danger"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">{t(lang, 'admin.logout')}</span>
            </button>
          </div>
        }
      />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
    </div>
  )
}
