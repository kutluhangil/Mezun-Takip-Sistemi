'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ChevronDown, Mail } from 'lucide-react'
import { t } from '@/lib/i18n'
import { Art } from '@/components/ui/Art'
import { btn, Notice } from '@/components/ui/AppShell'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'
import { OtpInput } from './OtpInput'

type Term = 'guz' | 'bahar' | 'yaz'
const TERMS: Term[] = ['guz', 'bahar', 'yaz']
const RESEND_SECONDS = 30

function Field({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[14.5px] font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
    </div>
  )
}

export function GraduateLoginClient({ kvkkTextTr, kvkkTextEn }: { kvkkTextTr: string; kvkkTextEn: string }) {
  const { lang } = useUI()
  const router = useRouter()
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: thisYear + 2 - 2018 }, (_, i) => thisYear + 1 - i)

  const [step, setStep] = useState<'info' | 'code'>('info')
  const [form, setForm] = useState({ fullName: '', email: '', studentNumber: '', graduationYear: String(thisYear), graduationTerm: '' as Term | '' })
  const [kvkk, setKvkk] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const fail = (msg: string) => {
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 450)
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.graduationTerm) return fail(t(lang, 'login.termRequired'))
    if (!kvkk) return fail(t(lang, 'login.kvkkRequired'))
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, graduationYear: Number(form.graduationYear), kvkkAccepted: kvkk, lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return fail(data.error || t(lang, 'error.body'))
      setDevCode(data.devCode ?? null)
      setCode('')
      setStep('code')
      setCooldown(RESEND_SECONDS)
    } catch {
      fail(t(lang, 'error.network'))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (value = code) => {
    if (value.length !== 6 || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: value, lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCode('')
        return fail(data.error || t(lang, 'error.body'))
      }
      router.push(data.redirectTo || '/anket')
      router.refresh()
    } catch {
      fail(t(lang, 'error.network'))
    } finally {
      setBusy(false)
    }
  }

  const kvkkText = (lang === 'en' ? kvkkTextEn : kvkkTextTr) || t(lang, 'login.kvkkPending')

  return (
    <PublicShell>
      <div className="mx-auto max-w-[520px] px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="reveal text-center">
          <Art name="login" priority className="mx-auto size-28 sm:size-36" />
          <p className="mt-5 text-[13.5px] text-ink-3">{t(lang, step === 'info' ? 'login.step1' : 'login.step2')}</p>
          <h1 className="serif mt-2 text-[36px] leading-tight text-ink sm:text-[44px]">
            {t(lang, step === 'info' ? 'login.title' : 'login.otpTitle')}
          </h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-ink-2">
            {step === 'info' ? t(lang, 'login.subtitle') : (
              <>
                <span className="font-medium text-ink">{form.email}</span> {t(lang, 'login.otpSubtitle')}
              </>
            )}
          </p>
        </div>

        <div className={`mt-9 ${shake ? 'shake' : ''}`}>
          {error && <div className="mb-5"><Notice tone="error">{error}</Notice></div>}

          {step === 'info' ? (
            <form onSubmit={requestCode} className="enter space-y-5" noValidate>
              <Field id="fullName" label={t(lang, 'login.fullName')}>
                <input id="fullName" className="field" autoComplete="name" required minLength={2} maxLength={120}
                  value={form.fullName} onChange={set('fullName')} />
              </Field>
              <Field id="email" label={t(lang, 'login.email')} hint={t(lang, 'login.emailHint')}>
                <input id="email" type="email" className="field" autoComplete="email" inputMode="email" required
                  placeholder="ad.soyad@gmail.com" value={form.email} onChange={set('email')} />
              </Field>
              <Field id="studentNumber" label={t(lang, 'login.studentNumber')}>
                <input id="studentNumber" className="field font-mono tabular" inputMode="numeric" required minLength={4} maxLength={32}
                  placeholder="220401001" value={form.studentNumber} onChange={set('studentNumber')} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <Field id="graduationYear" label={t(lang, 'login.gradYear')}>
                  <select id="graduationYear" className="field tabular" value={form.graduationYear} onChange={set('graduationYear')}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <div>
                  <span id="termLabel" className="mb-2 block text-[14.5px] font-medium text-ink">{t(lang, 'login.gradTerm')}</span>
                  <div role="radiogroup" aria-labelledby="termLabel" className="grid grid-cols-3 gap-2">
                    {TERMS.map((term) => (
                      <button key={term} type="button" role="radio" aria-checked={form.graduationTerm === term}
                        onClick={() => setForm((f) => ({ ...f, graduationTerm: term }))}
                        className="choice !min-h-12 justify-center !px-2 text-center">
                        {t(lang, `login.term${term === 'guz' ? 'Guz' : term === 'bahar' ? 'Bahar' : 'Yaz'}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <details className="rounded-xl border border-line-2 bg-sunk/50">
                <summary className="flex min-h-12 items-center justify-between gap-3 px-4 text-[14.5px] text-ink">
                  {t(lang, 'login.kvkkTitle')}
                  <ChevronDown size={16} className="chev text-ink-3 transition-transform" />
                </summary>
                <div className="scroll-thin max-h-56 overflow-y-auto whitespace-pre-line px-4 pb-4 text-[13.5px] leading-relaxed text-ink-2">{kvkkText}</div>
              </details>
              <button type="button" role="checkbox" aria-checked={kvkk} onClick={() => setKvkk((v) => !v)} className="choice items-start">
                <span className="mark mt-0.5 rounded-md">{kvkk && <CheckIcon />}</span>
                <span className="text-[14.5px] leading-relaxed text-ink-2">{t(lang, 'login.kvkkAccept')}</span>
              </button>

              <button type="submit" disabled={busy} className={`${btn.primary} w-full`}>
                {busy ? t(lang, 'login.sending') : t(lang, 'login.sendCode')}
                {!busy && <Mail size={17} strokeWidth={1.75} />}
              </button>
            </form>
          ) : (
            <div className="enter space-y-6">
              <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} invalid={Boolean(error)} label={t(lang, 'login.otpTitle')} />
              {devCode && (
                <Notice tone="warn">
                  {t(lang, 'login.devHint')} <span className="font-mono font-semibold tracking-widest">{devCode}</span>
                </Notice>
              )}
              <button type="button" onClick={() => void verify()} disabled={busy || code.length !== 6} className={`${btn.primary} w-full`}>
                {busy ? t(lang, 'login.verifying') : t(lang, 'login.otpVerify')}
                {!busy && <ArrowRight size={17} strokeWidth={1.75} />}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <button type="button" onClick={() => { setStep('info'); setError(null) }} className={btn.ghost}>
                  <ArrowLeft size={15} /> {t(lang, 'login.changeEmail')}
                </button>
                <button type="button" onClick={() => void requestCode()} disabled={cooldown > 0 || busy} className={`${btn.ghost} tabular disabled:opacity-50`}>
                  {cooldown > 0 ? t(lang, 'login.resendIn', { s: cooldown }) : t(lang, 'login.resend')}
                </button>
              </div>
              <p className="text-center text-[13px] leading-relaxed text-ink-3">{t(lang, 'login.spamHint')}</p>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}
