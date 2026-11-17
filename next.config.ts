import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// Next.js hidrasyon betikleri ve tema satırı satır içi olduğu için script-src 'unsafe-inline' gerekir;
// dış kaynak yok, eval yalnız geliştirmede açık.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true },
  serverExternalPackages: ['pdfkit', 'exceljs', 'nodemailer', 'pg', 'dejavu-fonts-ttf'],
  outputFileTracingIncludes: {
    '/**/*': ['./db/migrations/**/*'],
    // Rapor logosu ve PDF fontu yalnız export fonksiyonunda gerekir
    '/api/admin/export': ['./public/brand/fbu-logo.png', './node_modules/dejavu-fonts-ttf/ttf/**/*'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
}

export default nextConfig
