import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Trans as TransWithoutContext } from 'react-i18next/TransWithoutContext';
import { config } from '@/shared/config';
import { AuraSigil } from '@/shared/ui';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { getLocalizedRoutes, ROUTES } from '@/shared/lib/routes';

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'common');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.home,
    title: t('metadata.root.title', { appName: config.appName }),
    description: t('metadata.root.description'),
  });
}

export default async function HomePage({
  params,
}: HomePageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const { t, i18n } = await getServerTranslation(locale, 'common');
  const routes = getLocalizedRoutes(locale);
  const capabilities = [
    { code: 'AUTH', id: 'auth' },
    { code: '2FA', id: 'twoFactor' },
    { code: 'OAUTH', id: 'oauth' },
    { code: 'ATLAS', id: 'atlas' },
  ];

  return (
    <div>
      {/* Hero — the thesis: an identity inside its aura. */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)',
          gap: 40,
          alignItems: 'center',
          minHeight: 'min(64vh, 560px)',
        }}
      >
        <div>
          <span className="eyebrow">
            {t('home.eyebrow', { appName: config.appName })}
          </span>
          <h1 style={{ marginTop: 18 }}>
            <TransWithoutContext
              t={t}
              i18n={i18n}
              i18nKey="home.hero.title"
              components={{
                lineBreak: <br />,
                accent: <span style={{ color: 'var(--iris)' }} />,
              }}
            />
          </h1>
          <p className="subtitle" style={{ maxWidth: 460, marginTop: 6 }}>
            {t('home.hero.description')}
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Link
              href={routes.signUp}
              style={{
                background: 'var(--iris)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 26px',
                borderRadius: 'var(--r-pill)',
                boxShadow: '0 12px 30px -12px rgba(91,75,255,0.7)',
              }}
            >
              {t('home.actions.createIdentity')}
            </Link>
            <Link
              href={routes.countries}
              style={{
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 26px',
                borderRadius: 'var(--r-pill)',
              }}
            >
              {t('home.actions.exploreAtlas')}
            </Link>
          </div>
          {/* credential strip — data as material */}
          <div
            className="mono"
            style={{
              marginTop: 34,
              fontSize: 12.5,
              color: 'var(--mist)',
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <span>jwt · access+refresh</span>
            <span style={{ color: 'var(--line)' }}>/</span>
            <span>totp · 2fa</span>
            <span style={{ color: 'var(--line)' }}>/</span>
            <span>oauth · github·telegram</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AuraSigil size={300} />
        </div>
      </section>

      {/* Capabilities — a real list, labelled by domain (not decorative 01/02/03) */}
      <section style={{ marginTop: 24 }}>
        <div className="grid grid-3">
          {capabilities.map((c) => (
            <div key={c.code} className="card">
              <span className="eyebrow">{c.code}</span>
              <h4 style={{ marginTop: 12 }}>
                {t(`home.capabilities.${c.id}.title`)}
              </h4>
              <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                {t(`home.capabilities.${c.id}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
