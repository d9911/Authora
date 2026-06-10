import type { Metadata, Viewport } from 'next';
import '@/shared/styles/globals.scss';
import { StoreProvider } from '@/processes/store/StoreProvider';
import { HeaderMain } from '@/widgets/HeaderMain/HeaderMain';
import { FooterMain } from '@/widgets/FooterMain/FooterMain';
import { config } from '@/shared/config';
import { ServiceWorkerRegister } from '@/shared/lib/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: config.appName,
  description: 'Fullstack app with auth, profile and public location pages',
  manifest: '/manifest.json',
  applicationName: config.appName,
  appleWebApp: { capable: true, title: config.appName, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#0f1115',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <ServiceWorkerRegister />
          <HeaderMain />
          <main className="container page">{children}</main>
          <FooterMain />
        </StoreProvider>
      </body>
    </html>
  );
}
