import type { Metadata, Viewport } from 'next'
import '@/shared/styles/globals.scss'
import { fontClassName } from '@/shared/styles/fonts'
import { StoreProvider } from '@/processes/store/StoreProvider'
import { ThemeHeaderToggle, ThemeInitScript, ThemeProvider } from '@/processes/theme'
import { HeaderMain } from '@/widgets/HeaderMain/HeaderMain'
import { FooterMain } from '@/widgets/FooterMain/FooterMain'
import { config } from '@/shared/config'
import { ServiceWorkerRegister } from '@/shared/lib/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: `${config.appName} — identity, secured`,
  description: 'Authentication, profiles and a public atlas. Your identity, with an aura.',
  manifest: '/manifest.json',
  applicationName: config.appName,
  appleWebApp: { capable: true, title: config.appName, statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#f5f4f8',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName || undefined} suppressHydrationWarning>
      <body>
        <ThemeInitScript />
        <ThemeProvider>
          <StoreProvider>
            <ServiceWorkerRegister />
            <HeaderMain afterActions={<ThemeHeaderToggle />} />
            <main className="container page">{children}</main>
            <FooterMain />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
