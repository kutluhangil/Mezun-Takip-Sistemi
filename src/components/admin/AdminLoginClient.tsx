'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock } from 'lucide-react'
import { t } from '@/lib/i18n'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function AdminLoginClient({ showDemoLogin = false }: { showDemoLogin?: boolean }) {
  const { lang } = useUI()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error || 'Giriş başarısız.')
        setShake(false)
        requestAnimationFrame(() => setShake(true))
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Bağlantı hatası.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/demo-login', { method: 'POST' })
      const data = (await res.json()) as { error?: string; redirectTo?: string }
      if (!res.ok) {
        setError(data.error || 'Demo yönetici girişi açılamadı.')
        return
      }
      router.push(data.redirectTo || '/admin')
      router.refresh()
    } catch {
      setError('Bağlantı hatası.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <div className={`enter rounded-3xl border border-line-2 bg-raised/90 p-6 sm:p-8 shadow-[var(--shadow)] ${shake ? 'shake' : ''}`}>
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-band/35 text-clay-ink">
            <Lock className="size-5" />
          </div>
          <h1 className="serif mt-4 text-3xl text-ink">{t(lang, 'admin.loginTitle')}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{t(lang, 'admin.loginSub')}</p>

          {showDemoLogin && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-dashed border-clay/60 bg-band/25 px-4 py-3">
              <div className="text-xs sm:text-sm text-ink-2">
                <strong className="font-semibold text-clay-ink">
                  {lang === 'en' ? 'Temporary Demo:' : 'Geçici Demo Önizleme:'}
                </strong>{' '}
                {lang === 'en'
                  ? 'Skip password and inspect the admin dashboard directly.'
                  : 'Şifre girmeden doğrudan yönetici panelini aç.'}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleDemoLogin}
                className="shrink-0 inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-clay px-4 text-xs sm:text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                <span>{lang === 'en' ? 'Open Admin' : 'Panele Geç'}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="adminEmail">
                E-posta
              </label>
              <input
                id="adminEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fbu.edu.tr"
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink" htmlFor="adminPass">
                {t(lang, 'admin.password')}
              </label>
              <input
                id="adminPass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="enter-btn flex w-full min-h-[50px] items-center justify-center rounded-full bg-ink px-6 text-base font-medium text-bg disabled:opacity-60"
            >
              {t(lang, 'admin.signIn')}
            </button>
          </form>
        </div>
      </div>
    </PublicShell>
  )
}
