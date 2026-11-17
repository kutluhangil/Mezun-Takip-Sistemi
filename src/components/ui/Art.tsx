import React from 'react'
import manifest from '@/data/art-manifest.json'

/**
 * Gravür illüstrasyonlar. Dosyalar `public/art/<ad>.webp` (açık) ve `<ad>-dark.webp` (koyu) olarak durur;
 * kaynaklar ve promptlar docs/GEMINI-GORSEL-PROMPTLARI.md içinde, dönüştürme `npm run art`.
 * Manifestte olmayan görsel hiç çizilmez, kırık görsel kutusu çıkmaz.
 */
export type ArtName = 'hero' | 'login' | 'privacy' | 'waiting' | 'thanks' | 'admin' | 'empty' | 'offline' | 'ornament' | 'footer' | 'logo'

/** `npm run art` yazar: yalnız public/art içinde gerçekten bulunan dosyalar */
const LIGHT = new Set<string>(manifest.light)
const DARK = new Set<string>(manifest.dark)

export const hasArt = (name: ArtName) => LIGHT.has(name)

export function Art({ name, className = '', priority = false }: { name: ArtName; className?: string; priority?: boolean }) {
  if (!LIGHT.has(name)) return null
  const loading = priority ? 'eager' : 'lazy'
  const hasDark = DARK.has(name)
  return (
    <span className={`block ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/art/${name}.webp`} alt="" loading={loading} decoding="async"
        className={`block h-full w-full object-contain ${hasDark ? 'dark:hidden' : ''}`} />
      {hasDark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/art/${name}-dark.webp`} alt="" loading={loading} decoding="async" className="hidden h-full w-full object-contain dark:block" />
      )}
    </span>
  )
}
