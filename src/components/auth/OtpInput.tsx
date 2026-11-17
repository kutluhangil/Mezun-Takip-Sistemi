'use client'

import React, { useRef } from 'react'

/** 6 ayrık hane; yapıştırma, iOS/Android tek seferlik kod önerisi ve geri silme desteklenir. */
export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  label,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  invalid?: boolean
  label: string
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  const setFrom = (start: number, raw: string) => {
    const clean = raw.replace(/\D/g, '')
    if (!clean) return
    const next = (value.slice(0, start) + clean).slice(0, 6)
    onChange(next)
    refs.current[Math.min(next.length, 5)]?.focus()
    if (next.length === 6) onComplete?.(next)
  }

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = e.target.value
            if (v.length > 1) return setFrom(i, v)
            if (/^\d$/.test(v)) setFrom(i, v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault()
              const pos = d ? i : Math.max(0, i - 1)
              onChange(value.slice(0, pos) + value.slice(pos + 1))
              refs.current[pos]?.focus()
            }
            if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus()
            if (e.key === 'ArrowRight') refs.current[i + 1]?.focus()
          }}
          onPaste={(e) => {
            e.preventDefault()
            setFrom(0, e.clipboardData.getData('text'))
          }}
          className="field h-14 w-11 !rounded-xl !px-0 text-center font-mono text-[22px] tabular sm:h-16 sm:w-13 sm:text-[26px]"
        />
      ))}
    </div>
  )
}
