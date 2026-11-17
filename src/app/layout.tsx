import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import { getServerLang, getServerTheme } from '@/lib/auth'
import { UIProvider } from '@/components/ui/UIProvider'

export const metadata: Metadata = {
  title: {
    default: 'İlk ve Acil Yardım Mezun Takip Sistemi · Fenerbahçe Üniversitesi',
    template: '%s · FBÜ Mezun Takip',
  },
  description:
    'Fenerbahçe Üniversitesi Sağlık Hizmetleri Meslek Yüksekokulu İlk ve Acil Yardım Programı mezun takip ve anket portalı.',
  icons: { icon: '/brand/fbu-logo.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f9f9f7',
}

// İlk boyamadan önce temayı uygular: koyu temada beyaz yanıp sönme olmaz
const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )mts_theme=(light|dark|system)/);var p=m?m[1]:'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})()`

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [lang, theme] = await Promise.all([getServerLang(), getServerTheme()])

  return (
    <html lang={lang} data-theme={theme === 'system' ? undefined : theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-bg text-ink antialiased">
        <UIProvider initialLang={lang} initialTheme={theme}>
          {children}
        </UIProvider>
      </body>
    </html>
  )
}
