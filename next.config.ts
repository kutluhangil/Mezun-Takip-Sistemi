import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  images: { unoptimized: true },
  serverExternalPackages: ['pdfkit', 'exceljs', 'nodemailer', 'pg', 'dejavu-fonts-ttf'],
  outputFileTracingIncludes: {
    '/**/*': [
      './db/migrations/**/*',
      './public/brand/fbu-logo.png',
      './node_modules/dejavu-fonts-ttf/ttf/**/*',
    ],
  },
}

export default nextConfig
