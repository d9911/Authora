import Link from 'next/link';
import { UiKitShowcase } from '@/entities/ui-kit';
import { Badge, Card, SectionHeader, SpatialPreview } from '@/shared/ui';
import styles from './UiKitPage.module.scss';

const layerCards = [
  {
    layer: 'shared/ui',
    title: 'Primitives',
    description: 'Buttons, cards, tabs, controls, badges, overlays and depth previews.',
  },
  {
    layer: 'entities/ui-kit',
    title: 'Compositions',
    description: 'Selected states, grouped examples and product-facing kit demonstrations.',
  },
  {
    layer: 'widgets/page-blocks',
    title: 'Page assembly',
    description: 'Hero, layer map and showcase are composed into a ready public block.',
  },
  {
    layer: 'app/(public)/ui',
    title: 'Thin route',
    description: 'The Next.js route imports the block and avoids local business logic.',
  },
];

const tokens = [
  ['Ink', '#17141f'],
  ['Iris', '#5b4bff'],
  ['Halo', '#9f8cff'],
  ['Signal', '#12b886'],
  ['Paper', '#f5f4f8'],
];

export function UiKitPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="ui-kit-title">
        <div className={styles.heroCopy}>
          <div className={styles.badgeRow}>
            <Badge tone="accent">Dependency-free</Badge>
            <Badge tone="success">FSD aligned</Badge>
            <Badge>CSS depth</Badge>
          </div>
          <h1 id="ui-kit-title" className={styles.title}>
            Spatial UI kit for premium product screens.
          </h1>
          <p className={styles.subtitle}>
            A reusable component selection page for cards, controls, overlays, pseudo-3D
            previews and page sections. The route stays thin; reusable pieces stay in the
            correct Feature-Sliced layer.
          </p>
          <div className={styles.heroActions}>
            <Link href="#kit-parts" className={styles.primaryAction}>
              Explore parts
            </Link>
            <Link href="#layer-map" className={styles.secondaryAction}>
              View layers
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <SpatialPreview />
          <div className={styles.floatingPanel}>
            <span>Composition path</span>
            <strong>{'shared -> entities -> widgets -> app'}</strong>
          </div>
        </div>
      </section>

      <section id="layer-map" className={styles.layerSection} aria-labelledby="layer-map-title">
        <SectionHeader
          eyebrow="Feature-Sliced Design"
          title="Every component has a layer."
          description="Shared primitives stay generic. UI-kit compositions live in entities. The final public page is assembled as a widget page-block."
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
          eyebrow="Design tokens"
          title="The page reuses the current Authora visual system."
          description="These values are already defined as global CSS variables, so the kit extends the project style instead of creating a separate theme."
        />
        <div className={styles.tokenGrid}>
          {tokens.map(([name, color]) => (
            <div key={name} className={styles.token}>
              <span style={{ background: color }} />
              <div>
                <strong>{name}</strong>
                <code>{color}</code>
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
