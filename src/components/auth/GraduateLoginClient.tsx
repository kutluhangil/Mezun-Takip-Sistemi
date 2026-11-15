'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, MailCheck, ShieldCheck } from 'lucide-react'
import { t } from '@/lib/i18n'
import { PublicShell } from '@/components/ui/Shells'
import { useUI } from '@/components/ui/UIProvider'

export function GraduateLoginClient({
  kvkkTextTr,
  kvkkTextEn,
  showDemoLogin = false,
}: {
  kvkkTextTr: string
  kvkkTextEn: string
  showDemoLogin?: boolean
}) {
  const { lang } = useUI()
  const router = useRouter()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2018 + 2 }, (_, i) => currentYear + 1 - i)

  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [graduationYear, setGraduationYear] = useState<string>(String(currentYear))
  const [graduationTerm, setGraduationTerm] = useState<'guz' | 'bahar' | 'yaz'>('bahar')
  const [kvkkAccepted, setKvkkAccepted] = useState(false)
  const [kvkkOpen, setKvkkOpen] = useState(false)

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)

  const triggerShake = () => {
    setShake(false)
    requestAnimationFrame(() => setShake(true))
  }

  const handleDemoLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/demo-login', { method: 'POST' })
      const data = (await res.json()) as { error?: string; redirectTo?: string }
      if (!res.ok) {
        setError(data.error || 'Demo girişi açılamadı.')
        return
      }
      router.push(data.redirectTo || '/anket')
      router.refresh()
    } catch {
      setError('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          studentNumber,
          graduationYear,
          graduationTerm,
          kvkkAccepted,
          lang,
        }),
      })
      const data = (await res.json()) as { error?: string; devCode?: string }
      if (!res.ok) {
        setError(data.error || 'Kod gönderilemedi.')
        triggerShake()
        return
      }
      setDevCode(data.devCode ?? null)
      setDigits(['', '', '', '', '', ''])
      setStep('otp')
      setTimeout(() => otpRefs.current[0]?.focus(), 80)
    } catch {
      setError('Bağlantı hatası oluştu.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleDigitChange = (idx: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) {
      const next = [...digits]
      next[idx] = ''
      setDigits(next)
      return
    }
    if (clean.length > 1) {
      const next = [...digits]
      for (let i = 0; i < 6 && idx + i < 6; i++) {
        next[idx + i] = clean[i]
      }
      setDigits(next)
      const target = Math.min(5, idx + clean.length)
      otpRefs.current[target]?.focus()
      return
    }
    const next = [...digits]
    next[idx] = clean
    setDigits(next)
    if (idx < 5) otpRefs.current[idx + 1]?.focus()
  }

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const code = digits.join('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, lang }),
      })
      const data = (await res.json()) as { error?: string; redirectTo?: string }
      if (!res.ok) {
        setError(data.error || 'Kod doğrulanamadı.')
        triggerShake()
        return
      }
      router.push(data.redirectTo || '/anket')
      router.refresh()
    } catch {
      setError('Doğrulama sırasında bağlantı hatası.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const kvkkDisplayText =
    (lang === 'en' ? kvkkTextEn.trim() : kvkkTextTr.trim()) || t(lang, 'login.kvkkPending')

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
        <div
          className={`enter rounded-3xl border border-line-2 bg-raised/90 p-5 sm:p-8 shadow-[var(--shadow)] ${
            shake ? 'shake' : ''
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-ink">
            {t(lang, 'brand.uni')}
          </p>
          <h1 className="serif mt-2 text-3xl sm:text-4xl font-normal text-ink">
            {step === 'form' ? t(lang, 'login.title') : t(lang, 'login.otpTitle')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-ink-2">
            {step === 'form' ? (
              t(lang, 'login.subtitle')
            ) : (
              <>
                <span className="font-semibold text-ink">{email}</span> {t(lang, 'login.otpSubtitle')}
              </>
            )}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {showDemoLogin && step === 'form' && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-dashed border-clay/60 bg-band/25 px-4 py-3">
              <div className="text-xs sm:text-sm text-ink-2">
                <strong className="font-semibold text-clay-ink">
                  {lang === 'en' ? 'Temporary Demo:' : 'Geçici Demo Önizleme:'}
                </strong>{' '}
                {lang === 'en'
                  ? 'Skip email code and inspect the 5-step survey directly.'
                  : 'E-posta kodu beklemeden doğrudan anket ekranını aç.'}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleDemoLogin}
                className="shrink-0 inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-clay px-4 text-xs sm:text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
              >
                <span>{lang === 'en' ? 'Open Survey' : 'Ankete Geç'}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="fullName">
                  {t(lang, 'login.fullName')} <span className="text-clay">*</span>
                </label>
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="email">
                  {t(lang, 'login.email')} <span className="text-clay">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad.soyad@gmail.com"
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 text-base text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="studentNumber">
                  {t(lang, 'login.studentNumber')} <span className="text-clay">*</span>
                </label>
                <input
                  id="studentNumber"
                  inputMode="numeric"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="220401001"
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 font-mono tabular text-base text-ink focus:border-clay focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-ink" htmlFor="gradYear">
                    {t(lang, 'login.gradYear')} <span className="text-clay">*</span>
                  </label>
                  <select
                    id="gradYear"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="mt-1.5 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 tabular text-base text-ink focus:border-clay focus:outline-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-ink">
                    {t(lang, 'login.gradTerm')} <span className="text-clay">*</span>
                  </span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ['guz', t(lang, 'login.termGuz')],
                        ['bahar', t(lang, 'login.termBahar')],
                        ['yaz', t(lang, 'login.termYaz')],
                      ] as const
                    ).map(([val, lbl]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGraduationTerm(val)}
                        className={`min-h-[48px] rounded-xl border text-sm font-medium transition-colors ${
                          graduationTerm === val
                            ? 'border-clay bg-band/35 text-ink'
                            : 'border-line bg-surface text-ink-2 hover:border-ink-3'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line-2 bg-sunk/60 p-4">
                <button
                  type="button"
                  onClick={() => setKvkkOpen((o) => !o)}
                  className="flex w-full items-center justify-between text-left text-sm font-medium text-ink"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4 text-clay" />
                    {t(lang, 'login.kvkkTitle')}
                  </span>
                  <ChevronDown className={`size-4 text-ink-3 transition-transform ${kvkkOpen ? 'rotate-180' : ''}`} />
                </button>
                {kvkkOpen && (
                  <p className="mt-3 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-ink-2">
                    {kvkkDisplayText}
                  </p>
                )}

                <label className="mt-3 flex cursor-pointer items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) => setKvkkAccepted(e.target.checked)}
                    className="mt-1 size-5 shrink-0 accent-[#d97757]"
                  />
                  <span className="text-xs sm:text-sm leading-snug text-ink-2">
                    {t(lang, 'login.kvkkAccept')}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="enter-btn mt-2 flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-medium text-bg disabled:opacity-60"
              >
                <span>{loading ? t(lang, 'login.sending') : t(lang, 'login.sendCode')}</span>
                <ArrowRight className="size-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
              {devCode && (
                <div className="rounded-2xl border border-clay/45 bg-band/30 px-4 py-3 text-sm text-ink">
                  <span>{t(lang, 'login.devHint')} </span>
                  <strong className="font-mono text-base tracking-widest text-clay-ink">{devCode}</strong>
                </div>
              )}

              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {digits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={d}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    aria-label={`Kod ${idx + 1}`}
                    className="min-h-[54px] w-full rounded-xl border border-line bg-surface text-center font-mono text-xl font-semibold tabular text-ink focus:border-clay focus:outline-none"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || digits.join('').length !== 6}
                className="enter-btn flex w-full min-h-[52px] items-center justify-center gap-2 rounded-full bg-ink px-6 text-base font-medium text-bg disabled:opacity-50"
              >
                <MailCheck className="size-4" />
                <span>{loading ? t(lang, 'login.verifying') : t(lang, 'login.otpVerify')}</span>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setStep('form')
                  }}
                  className="min-h-[44px] px-2 text-sm text-ink-2 hover:text-ink underline underline-offset-4"
                >
                  {t(lang, 'login.changeEmail')}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRequestOtp}
                  className="min-h-[44px] px-2 text-sm font-medium text-clay-ink hover:underline underline-offset-4"
                >
                  {t(lang, 'login.resend')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
