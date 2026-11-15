import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import { getServerLang } from '@/lib/auth'
import { UIProvider } from '@/components/ui/UIProvider'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'İlk ve Acil Yardım Mezun Takip Sistemi · Fenerbahçe Üniversitesi',
  description:
    'Fenerbahçe Üniversitesi Sağlık Hizmetleri Meslek Yüksekokulu İlk ve Acil Yardım Programı mezun takip ve anket portalı.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f9f9f7',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialLang = await getServerLang()

  return (
    <html lang={initialLang}>
      <body className="app-paper antialiased selection:bg-clay/20 selection:text-ink">
        <UIProvider initialLang={initialLang}>{children}</UIProvider>
      </body>
    </html>
  )
}
