'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { btn, Notice } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function AdminLoginClient() {
  const { lang } = useUI()
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), remember }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || t(lang, 'error.body'))
        setShake(true)
        setTimeout(() => setShake(false), 450)
        return
      }
      router.push('/admin')
      router.refresh()
    } catch {
      setError(t(lang, 'error.network'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[440px] px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="reveal text-center">
          <Art name="admin" priority className="mx-auto size-32 sm:size-40" />
          <h1 className="serif mt-5 text-[34px] leading-tight text-ink sm:text-[42px]">{t(lang, 'admin.loginTitle')}</h1>
          <p className="mx-auto mt-3 max-w-[38ch] text-[15.5px] leading-relaxed text-ink-2">{t(lang, 'admin.loginSub')}</p>
        </div>
        <form onSubmit={submit} className={`enter mt-9 grid gap-5 ${shake ? 'shake' : ''}`}>
          {error && <Notice tone="error">{error}</Notice>}
          <label className="block">
            <span className="mb-2 block text-[14.5px] font-medium text-ink">{t(lang, 'admin.email')}</span>
            <input name="email" type="email" className="field" autoComplete="username" inputMode="email" required />
          </label>
          <label className="block">
            <span className="mb-2 block text-[14.5px] font-medium text-ink">{t(lang, 'admin.password')}</span>
            <span className="relative block">
              <input name="password" type={show ? 'text' : 'password'} className="field !pr-12" autoComplete="current-password" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:text-ink"
                aria-label={t(lang, show ? 'admin.hidePassword' : 'admin.showPassword')}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          <button type="button" role="checkbox" aria-checked={remember} onClick={() => setRemember((r) => !r)} className="choice">
            <span className="mark rounded-md">{remember && <span className="size-2 rounded-sm bg-white" />}</span>
            <span className="text-[14.5px] text-ink-2">{t(lang, 'admin.rememberMe')}</span>
          </button>
          <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
            {t(lang, 'admin.signIn')}
            <ArrowRight size={17} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </PublicShell>
  )
}
