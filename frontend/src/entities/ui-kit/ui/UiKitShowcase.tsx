'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  ButtonMain,
  Card,
  IconButton,
  InputMain,
  ModalMain,
  ProgressBar,
  RangeControl,
  SectionHeader,
  SpatialPreview,
  Tabs,
  Toast,
  ToggleSwitch,
  type TabOption,
} from '@/shared/ui';
import styles from './UiKitShowcase.module.scss';

type KitCategory = 'all' | 'surfaces' | 'actions' | 'forms' | 'feedback';

interface KitComponentCard {
  id: string;
  category: Exclude<KitCategory, 'all'>;
  title: string;
  description: string;
  layer: 'shared/ui' | 'entities/ui-kit' | 'widgets/page-blocks';
  status: 'ready' | 'interactive' | 'layout';
}

const tabs: TabOption<KitCategory>[] = [
  { value: 'all', label: 'All parts' },
  { value: 'surfaces', label: 'Surfaces' },
  { value: 'actions', label: 'Actions' },
  { value: 'forms', label: 'Forms' },
  { value: 'feedback', label: 'Feedback' },
];

const components: KitComponentCard[] = [
  {
    id: 'spatial-card',
    category: 'surfaces',
    title: 'Spatial Card',
    description: 'Premium surface with hover lift, glow border, selected state and crisp radius.',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'hero-preview',
    category: 'surfaces',
    title: 'Pseudo 3D Preview',
    description: 'CSS/SVG depth scene for hero blocks when no 3D dependency is allowed.',
    layer: 'shared/ui',
    status: 'ready',
  },
  {
    id: 'actions',
    category: 'actions',
    title: 'Action Set',
    description: 'Primary, secondary, ghost and icon actions with focus-visible and active states.',
    layer: 'shared/ui',
    status: 'ready',
  },
  {
    id: 'segment-tabs',
    category: 'actions',
    title: 'Segment Tabs',
    description: 'Accessible tablist for filters, modes and showcase navigation.',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'inputs',
    category: 'forms',
    title: 'Control Stack',
    description: 'Input, toggle, range and progress primitives for dense tool surfaces.',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'overlay',
    category: 'feedback',
    title: 'Overlay Feedback',
    description: 'Modal and toast patterns for confirmations, previews and saved states.',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'entity-group',
    category: 'surfaces',
    title: 'Entity Composition',
    description: 'Domain-facing compositions group primitive parts without leaking into shared.',
    layer: 'entities/ui-kit',
    status: 'layout',
  },
  {
    id: 'page-block',
    category: 'feedback',
    title: 'Page Block',
    description: 'Route-level assembly stays in widgets/page-blocks so app pages stay thin.',
    layer: 'widgets/page-blocks',
    status: 'layout',
  },
];

const statusTone = {
  ready: 'success',
  interactive: 'accent',
  layout: 'neutral',
} as const;

function Glyph({ name }: { name: 'grid' | 'spark' | 'panel' | 'check' | 'plus' | 'eye' }) {
  if (name === 'grid') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h6v6H4V5Zm10 0h6v6h-6V5ZM4 13h6v6H4v-6Zm10 0h6v6h-6v-6Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'panel') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm3 1v3h10v-3H7Zm0 5v4h4v-4H7Zm6 0v4h4v-4h-4Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.6 16.7 4.9 12l1.5-1.5 3.2 3.2 8-8L19.1 7 9.6 16.7Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" fill="currentColor" />
      </svg>
    );
  }

  if (name === 'eye') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5c4.7 0 8 4.1 9 7-1 2.9-4.3 7-9 7s-8-4.1-9-7c1-2.9 4.3-7 9-7Zm0 2c-3.2 0-5.8 2.5-6.8 5 1 2.5 3.6 5 6.8 5s5.8-2.5 6.8-5c-1-2.5-3.6-5-6.8-5Zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6Z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.5 6.1L20 6l-4.5 5.1L22 14l-6.6.6L17 22l-5-5.2L7 22l1.6-7.4L2 14l6.5-2.9L4 6l6.5 2.1L12 2Z" fill="currentColor" />
    </svg>
  );
}

export function UiKitShowcase() {
  const [activeTab, setActiveTab] = useState<KitCategory>('all');
  const [selectedId, setSelectedId] = useState('spatial-card');
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [depth, setDepth] = useState(72);
  const [toastOpen, setToastOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const visibleComponents = useMemo(
    () =>
      activeTab === 'all'
        ? components
        : components.filter((component) => component.category === activeTab),
    [activeTab],
  );

  const selectedComponent = components.find((component) => component.id === selectedId) ?? components[0];

  useEffect(() => {
    if (!toastOpen) return;

    const timeout = window.setTimeout(() => setToastOpen(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastOpen]);

  return (
    <section className={styles.showcase} aria-labelledby="ui-kit-showcase-title">
      <div className={styles.sectionTop}>
        <SectionHeader
          eyebrow="Component selector"
          title="Choose the parts, then compose them by layer."
          description="The selector demonstrates how neutral shared primitives become richer entity compositions without breaking the FSD dependency rule."
        />
        <Tabs options={tabs} value={activeTab} onChange={setActiveTab} label="UI kit categories" />
      </div>

      <div className={`${styles.layout} ${compactMode ? styles.compact : ''}`}>
        <div className={styles.catalog} aria-label="UI components">
          {visibleComponents.map((component) => {
            const selected = component.id === selectedId;

            return (
              <button
                key={component.id}
                type="button"
                className={`${styles.componentButton} ${selected ? styles.selected : ''}`}
                onClick={() => setSelectedId(component.id)}
              >
                <Card
                  interactive
                  selected={selected}
                  tone={selected ? 'glass' : 'plain'}
                  eyebrow={component.layer}
                  title={component.title}
                  description={component.description}
                  footer={
                    <div className={styles.cardFooter}>
                      <Badge tone={statusTone[component.status]}>{component.status}</Badge>
                      <span>{component.category}</span>
                    </div>
                  }
                />
              </button>
            );
          })}
        </div>

        <aside className={styles.inspector} aria-label="Selected component preview">
          <Card
            tone="dark"
            title={selectedComponent.title}
            description={selectedComponent.description}
            eyebrow="Selected"
            footer={
              <div className={styles.layerLine}>
                <Badge tone="accent" variant="outline">
                  {selectedComponent.layer}
                </Badge>
                <Badge tone={statusTone[selectedComponent.status]}>{selectedComponent.status}</Badge>
              </div>
            }
          >
            <SpatialPreview
              active={motionEnabled}
              density={compactMode ? 'calm' : 'rich'}
              style={{ minHeight: `${Math.max(200, depth * 3)}px` }}
            />
          </Card>

          <Card tone="glass" title="Controls" description="Local state changes the preview immediately.">
            <ToggleSwitch
              label="Motion"
              hint="CSS-only animation, disabled under reduced motion."
              checked={motionEnabled}
              onChange={(event) => setMotionEnabled(event.target.checked)}
            />
            <ToggleSwitch
              label="Compact density"
              hint="Switches the same components into a tighter layout."
              checked={compactMode}
              onChange={(event) => setCompactMode(event.target.checked)}
            />
            <RangeControl
              label="Scene depth"
              min={58}
              max={110}
              value={depth}
              suffix="%"
              onChange={(event) => setDepth(Number(event.target.value))}
            />
            <ProgressBar label="Composition readiness" value={depth} showValue />
          </Card>
        </aside>
      </div>

      <div className={styles.demoGrid}>
        <Card
          tone="plain"
          title="Action cluster"
          description="Buttons, icon buttons and state feedback share focus and hover behavior."
          footer={
            <div className={styles.actionRow}>
              <ButtonMain onClick={() => setToastOpen(true)}>Show toast</ButtonMain>
              <ButtonMain variant="secondary" onClick={() => setModalOpen(true)}>
                Open modal
              </ButtonMain>
              <IconButton icon={<Glyph name="spark" />} label="Generate" variant="accent" />
              <IconButton icon={<Glyph name="eye" />} label="Preview" variant="glass" />
            </div>
          }
        >
          <div className={styles.miniStats}>
            <span>
              <strong>8</strong>
              groups
            </span>
            <span>
              <strong>3+</strong>
              mechanics
            </span>
            <span>
              <strong>0</strong>
              deps
            </span>
          </div>
        </Card>

        <Card tone="glass" title="Form stack" description="Reusable controls for product, auth and admin surfaces.">
          <InputMain label="Search component" placeholder="Card, tabs, overlay..." />
          <InputMain label="Token preview" placeholder="ui-kit:selected" mono />
          <div className={styles.formActions}>
            <ButtonMain size="small">Apply</ButtonMain>
            <ButtonMain size="small" variant="ghost">
              Reset
            </ButtonMain>
          </div>
        </Card>

        <Card tone="accent" title="FSD map" description="One-way imports keep the kit reusable.">
          <div className={styles.layerStack}>
            {['app', 'widgets/page-blocks', 'entities/ui-kit', 'shared/ui'].map((layer, index) => (
              <div key={layer} className={styles.layerItem}>
                <Badge variant="outline">{String(index + 1).padStart(2, '0')}</Badge>
                <span>{layer}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className={styles.timeline} aria-label="UI composition process">
        {[
          ['01', 'Primitive', 'Build neutral controls in shared/ui.'],
          ['02', 'Composition', 'Group selected states and demos in entities/ui-kit.'],
          ['03', 'Page block', 'Assemble the public page in widgets/page-blocks.'],
          ['04', 'Route', 'Keep app route thin and predictable.'],
        ].map(([step, title, description]) => (
          <Card key={step} interactive tone="glass">
            <div className={styles.timelineItem}>
              <Badge tone="accent">{step}</Badge>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <Glyph name="check" />
            </div>
          </Card>
        ))}
      </div>

      <ModalMain open={modalOpen} title="Preview overlay" onClose={() => setModalOpen(false)}>
        <p className={styles.modalText}>
          This modal is opened from the UI kit entity and rendered by a shared primitive. It proves the
          overlay path without adding a new dependency.
        </p>
        <div className={styles.modalActions}>
          <ButtonMain onClick={() => setModalOpen(false)}>Close</ButtonMain>
          <ButtonMain
            variant="secondary"
            onClick={() => {
              setModalOpen(false);
              setToastOpen(true);
            }}
          >
            Save state
          </ButtonMain>
        </div>
      </ModalMain>

      <Toast
        open={toastOpen}
        tone="success"
        title="UI state updated"
        description="The selected kit configuration is visible on the page."
      />
    </section>
  );
}
