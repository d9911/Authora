import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import '@/shared/styles/globals.scss'
import { fontClassName } from '@/shared/styles/fonts'
import { StoreProvider } from '@/processes/store/StoreProvider'
import { AuthBootstrap } from '@/processes/store/AuthBootstrap'
import { ThemeHeaderToggle, ThemeInitScript, ThemeProvider } from '@/processes/theme'
import { HeaderMain } from '@/widgets/HeaderMain/HeaderMain'
import { FooterMain } from '@/widgets/FooterMain/FooterMain'
import { config } from '@/shared/config'
import { ServiceWorkerRegister } from '@/shared/lib/ServiceWorkerRegister'
import {
  getLocaleMetadata,
  i18nConfig,
  isSupportedLocale,
} from '@/shared/i18n/config'
import { I18nProvider } from '@/shared/i18n'
import { getServerTranslation, loadLocaleResources } from '@/shared/i18n/server'
import { productionOrigin } from '@/shared/i18n/metadata'

export async function generateMetadata({ params }: RootLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportedLocale(locale)) return {}
  const { t } = await getServerTranslation(locale, 'common')

  return {
    metadataBase: new URL(productionOrigin),
    title: {
      default: t('metadata.root.title', { appName: config.appName }),
      template: `%s | ${config.appName}`,
    },
    description: t('metadata.root.description'),
    manifest: '/manifest.json',
    applicationName: config.appName,
    appleWebApp: { capable: true, title: config.appName, statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = {
  themeColor: '#f5f4f8',
  width: 'device-width',
  initialScale: 1,
}

export function generateStaticParams() {
  return i18nConfig.supportedLocales.map((locale) => ({ locale }))
}

type RootLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()

  const localeMetadata = getLocaleMetadata(locale)
  const resources = await loadLocaleResources(locale)

  return (
    <html
      lang={locale}
      dir={localeMetadata.dir}
      className={fontClassName || undefined}
      suppressHydrationWarning
    >
      <body>
        <I18nProvider key={locale} locale={locale} resources={resources}>
          <ThemeInitScript />
          <ThemeProvider>
            <StoreProvider>
              <AuthBootstrap />
              <ServiceWorkerRegister />
              <HeaderMain afterActions={<ThemeHeaderToggle />} />
              <main className="container page">{children}</main>
              <FooterMain locale={locale} />
            </StoreProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
