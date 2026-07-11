import Link from 'next/link';
import { UiKitShowcase } from '@/entities/ui-kit';
import { getServerTranslation } from '@/shared/i18n/server';
import { type SupportedLocale } from '@/shared/i18n/config';
import { Badge, Card, SectionHeader, SpatialPreview } from '@/shared/ui';
import styles from './UiKitPage.module.scss';

export async function UiKitPage({ locale }: { locale: SupportedLocale }) {
  const { t } = await getServerTranslation(locale, 'ui');
  const layerCards = [
    {
      layer: 'shared/ui',
      title: t('page.layers.shared.title'),
      description: t('page.layers.shared.description'),
    },
    {
      layer: 'entities/ui-kit',
      title: t('page.layers.entities.title'),
      description: t('page.layers.entities.description'),
    },
    {
      layer: 'widgets/page-blocks',
      title: t('page.layers.widgets.title'),
      description: t('page.layers.widgets.description'),
    },
    {
      layer: 'app/[locale]/(public)/ui',
      title: t('page.layers.app.title'),
      description: t('page.layers.app.description'),
    },
  ];
  const tokens = [
    { name: t('page.tokens.paper'), value: 'var(--paper)', token: '--paper' },
    { name: t('page.tokens.card'), value: 'var(--card)', token: '--card' },
    { name: t('page.tokens.ink'), value: 'var(--ink)', token: '--ink' },
    { name: t('page.tokens.iris'), value: 'var(--iris)', token: '--iris' },
    { name: t('page.tokens.line'), value: 'var(--line)', token: '--line' },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="ui-kit-title">
        <div className={styles.heroCopy}>
          <div className={styles.badgeRow}>
            <Badge tone="accent">{t('page.badges.dependencyFree')}</Badge>
            <Badge tone="success">{t('page.badges.fsdAligned')}</Badge>
            <Badge tone="accent" variant="outline">
              {t('page.badges.themes')}
            </Badge>
            <Badge>{t('page.badges.cssDepth')}</Badge>
          </div>
          <h1 id="ui-kit-title" className={styles.title}>
            {t('page.hero.title')}
          </h1>
          <p className={styles.subtitle}>
            {t('page.hero.description')}
          </p>
          <div className={styles.heroActions}>
            <Link href="#kit-parts" className={styles.primaryAction}>
              {t('page.hero.explore')}
            </Link>
            <Link href="#layer-map" className={styles.secondaryAction}>
              {t('page.hero.layers')}
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <SpatialPreview />
          <div className={styles.floatingPanel}>
            <span>{t('page.hero.compositionPath')}</span>
            <strong>{'shared -> entities -> widgets -> app'}</strong>
          </div>
        </div>
      </section>

      <section id="layer-map" className={styles.layerSection} aria-labelledby="layer-map-title">
        <SectionHeader
          eyebrow={t('page.layerMap.eyebrow')}
          title={t('page.layerMap.title')}
          description={t('page.layerMap.description')}
        />
        <div className={styles.layerGrid}>
          {layerCards.map((item, index) => (
            <Card
              key={item.layer}
              interactive
              tone={index === 0 ? 'accent' : 'glass'}
              eyebrow={String(index + 1).padStart(2, '0')}
              title={item.title}
              description={item.description}
              footer={<Badge variant="outline">{item.layer}</Badge>}
            />
          ))}
        </div>
      </section>

      <section className={styles.tokenSection} aria-labelledby="token-title">
        <SectionHeader
          eyebrow={t('page.tokenSection.eyebrow')}
          title={t('page.tokenSection.title')}
          description={t('page.tokenSection.description')}
        />
        <div className={styles.tokenGrid}>
          {tokens.map((token) => (
            <div key={token.name} className={styles.token}>
              <span style={{ background: token.value }} />
              <div>
                <strong>{token.name}</strong>
                <code>{token.token}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div id="kit-parts">
        <UiKitShowcase />
      </div>
    </div>
  );
}
