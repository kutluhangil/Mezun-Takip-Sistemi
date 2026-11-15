import React from 'react'

export type ArtName = 'hero' | 'thanks' | 'empty' | 'admin' | 'offline' | 'ornament' | 'seal'

/**
 * Üretilen görseller docs/CODEX-GORSEL-PROMPTLARI.md içindeki promptlarla /public/art/<name>.webp olarak tutulur.
 */
const READY_ART: Partial<Record<ArtName, boolean>> = {
  thanks: true,
  ornament: true,
  seal: true,
  admin: true,
  empty: true,
  offline: true,
}

export function Art({
  name,
  className = '',
  size = 220,
}: {
  name: ArtName
  className?: string
  size?: number
}) {
  if (READY_ART[name]) {
    return (
      <span className={`${name === 'ornament' || name === 'seal' ? '' : 'art-ink'} inline-flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/art/${name}.webp`}
          alt=""
          width={name === 'ornament' ? 56 : size}
          height={name === 'ornament' ? 28 : size}
          className={`${name === 'seal' ? '' : 'mix-blend-multiply'} object-contain`}
        />
      </span>
    )
  }

  if (name === 'ornament') {
    return (
      <svg
        width={28}
        height={28}
        viewBox="0 0 28 28"
        fill="none"
        className={`text-clay ${className}`}
        aria-hidden="true"
      >
        <circle cx="14" cy="14" r="10.5" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 2" />
        <path d="M14 6.5v15M6.5 14h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="14" cy="14" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    )
  }

  if (name === 'seal') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        className={`text-ink-3 ${className}`}
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="52" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.1" />
        <circle cx="60" cy="60" r="44" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.9" strokeDasharray="3 3" />
        <path d="M60 28v64M28 60h64" stroke="#D97757" strokeOpacity="0.8" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M51 54h18v12H51z" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <circle cx="60" cy="60" r="19" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
      </svg>
    )
  }

  if (name === 'thanks') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <circle cx="120" cy="120" r="88" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="120" cy="120" r="64" fill="var(--band)" fillOpacity="0.32" stroke="#D97757" strokeWidth="1.4" />
        <path
          d="M84 126c-12-16-14-42-2-60M156 126c12-16 14-42 2-60"
          stroke="var(--ink)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M97 121l15 15 34-36" stroke="#D97757" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M90 170h60" stroke="var(--ink-3)" strokeWidth="1.1" strokeDasharray="2 3" />
      </svg>
    )
  }

  if (name === 'empty' || name === 'offline') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
        <rect x="46" y="34" width="108" height="132" rx="14" stroke="var(--ink)" strokeWidth="1.4" fill="var(--raised)" />
        <path d="M76 34h48v14H76z" fill="var(--band)" stroke="#D97757" strokeWidth="1.2" />
        <path d="M68 78h64M68 100h48M68 122h56" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="142" cy="144" r="22" fill="var(--bg)" stroke="#D97757" strokeWidth="1.6" />
        <path d="M135 144h14M142 137v14" stroke="#D97757" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'admin') {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className={className} aria-hidden="true">
        <rect x="30" y="42" width="140" height="116" rx="12" stroke="var(--ink)" strokeWidth="1.3" fill="var(--raised)" />
        <path d="M52 130V96M84 130V72M116 130V86M148 130V62" stroke="#D97757" strokeWidth="10" strokeLinecap="round" />
        <path d="M44 132h112" stroke="var(--ink-3)" strokeWidth="1.3" />
      </svg>
    )
  }

  // Hero: Parametrik/gravür Yıldızı + Kalp ritmi + Mezuniyet pusulası
  return (
    <svg width={size} height={size} viewBox="0 0 280 280" fill="none" className={className} aria-hidden="true">
      <circle cx="140" cy="140" r="118" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 4" />
      <circle cx="140" cy="140" r="94" stroke="var(--ink-3)" strokeOpacity="0.4" strokeWidth="0.9" />
      {/* Gravür gölge taraması */}
      <circle cx="140" cy="140" r="68" fill="var(--band)" fillOpacity="0.28" />
      {/* Sağlık / Paramedik Yaşam Yıldızı soyut gravür kolları */}
      <g stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round">
        <path d="M140 54v172" />
        <path d="M65 97l150 86" />
        <path d="M215 97L65 183" />
      </g>
      {/* Merkez tıbbi pusula rozeti */}
      <circle cx="140" cy="140" r="34" fill="var(--raised)" stroke="#D97757" strokeWidth="2.2" />
      {/* EKG nabız çizgisi */}
      <path
        d="M92 140h28l8-18 11 36 9-24 6 6h34"
        stroke="#D97757"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kuzey/Güney gravür çentikleri */}
      <circle cx="140" cy="22" r="3.5" fill="#D97757" />
      <circle cx="258" cy="140" r="2.5" fill="var(--ink-3)" />
      <circle cx="22" cy="140" r="2.5" fill="var(--ink-3)" />
    </svg>
  )
}
