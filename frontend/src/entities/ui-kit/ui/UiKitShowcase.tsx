'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  layer: 'shared/ui' | 'entities/ui-kit' | 'widgets/page-blocks';
  status: 'ready' | 'interactive' | 'layout';
}

const kitComponents: KitComponentCard[] = [
  {
    id: 'spatial-card',
    category: 'surfaces',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'hero-preview',
    category: 'surfaces',
    layer: 'shared/ui',
    status: 'ready',
  },
  {
    id: 'actions',
    category: 'actions',
    layer: 'shared/ui',
    status: 'ready',
  },
  {
    id: 'segment-tabs',
    category: 'actions',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'inputs',
    category: 'forms',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'overlay',
    category: 'feedback',
    layer: 'shared/ui',
    status: 'interactive',
  },
  {
    id: 'entity-group',
    category: 'surfaces',
    layer: 'entities/ui-kit',
    status: 'layout',
  },
  {
    id: 'page-block',
    category: 'feedback',
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
  const { t } = useTranslation('ui');
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
        ? kitComponents
        : kitComponents.filter((component) => component.category === activeTab),
    [activeTab],
  );

  const selectedComponent =
    kitComponents.find((component) => component.id === selectedId) ?? kitComponents[0];
  const tabs: TabOption<KitCategory>[] = [
    { value: 'all', label: t('showcase.tabs.all') },
    { value: 'surfaces', label: t('showcase.tabs.surfaces') },
    { value: 'actions', label: t('showcase.tabs.actions') },
    { value: 'forms', label: t('showcase.tabs.forms') },
    { value: 'feedback', label: t('showcase.tabs.feedback') },
  ];
  const componentTitle = (id: string) => t(`components.${id}.title`);
  const componentDescription = (id: string) => t(`components.${id}.description`);

  useEffect(() => {
    if (!toastOpen) return;

    const timeout = window.setTimeout(() => setToastOpen(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastOpen]);

  return (
    <section className={styles.showcase} aria-labelledby="ui-kit-showcase-title">
      <div className={styles.sectionTop}>
        <SectionHeader
          eyebrow={t('showcase.header.eyebrow')}
          title={t('showcase.header.title')}
          description={t('showcase.header.description')}
        />
        <Tabs
          options={tabs}
          value={activeTab}
          onChange={setActiveTab}
          label={t('showcase.accessibility.categories')}
        />
      </div>

      <div className={`${styles.layout} ${compactMode ? styles.compact : ''}`}>
        <div className={styles.catalog} aria-label={t('showcase.accessibility.components')}>
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
                  title={componentTitle(component.id)}
                  description={componentDescription(component.id)}
                  footer={
                    <div className={styles.cardFooter}>
                      <Badge tone={statusTone[component.status]}>
                        {t(`showcase.status.${component.status}`)}
                      </Badge>
                      <span>{t(`showcase.categories.${component.category}`)}</span>
                    </div>
                  }
                />
              </button>
            );
          })}
        </div>

        <aside
          className={styles.inspector}
          aria-label={t('showcase.accessibility.selectedPreview')}
        >
          <Card
            tone="dark"
            title={componentTitle(selectedComponent.id)}
            description={componentDescription(selectedComponent.id)}
            eyebrow={t('showcase.selected')}
            footer={
              <div className={styles.layerLine}>
                <Badge tone="accent" variant="outline">
                  {selectedComponent.layer}
                </Badge>
                <Badge tone={statusTone[selectedComponent.status]}>
                  {t(`showcase.status.${selectedComponent.status}`)}
                </Badge>
              </div>
            }
          >
            <SpatialPreview
              active={motionEnabled}
              density={compactMode ? 'calm' : 'rich'}
              style={{ minHeight: `${Math.max(200, depth * 3)}px` }}
            />
          </Card>

          <Card
            tone="glass"
            title={t('showcase.controls.title')}
            description={t('showcase.controls.description')}
          >
            <ToggleSwitch
              label={t('showcase.controls.motion.label')}
              hint={t('showcase.controls.motion.hint')}
              checked={motionEnabled}
              onChange={(event) => setMotionEnabled(event.target.checked)}
            />
            <ToggleSwitch
              label={t('showcase.controls.compact.label')}
              hint={t('showcase.controls.compact.hint')}
              checked={compactMode}
              onChange={(event) => setCompactMode(event.target.checked)}
            />
            <RangeControl
              label={t('showcase.controls.depth')}
              min={58}
              max={110}
              value={depth}
              suffix="%"
              onChange={(event) => setDepth(Number(event.target.value))}
            />
            <ProgressBar label={t('showcase.controls.readiness')} value={depth} showValue />
          </Card>
        </aside>
      </div>

      <div className={styles.demoGrid}>
        <Card
          tone="plain"
          title={t('showcase.demos.actions.title')}
          description={t('showcase.demos.actions.description')}
          footer={
            <div className={styles.actionRow}>
              <ButtonMain onClick={() => setToastOpen(true)}>
                {t('showcase.demos.actions.showToast')}
              </ButtonMain>
              <ButtonMain variant="secondary" onClick={() => setModalOpen(true)}>
                {t('showcase.demos.actions.openModal')}
              </ButtonMain>
              <IconButton
                icon={<Glyph name="spark" />}
                label={t('showcase.demos.actions.generate')}
                variant="accent"
              />
              <IconButton
                icon={<Glyph name="eye" />}
                label={t('showcase.demos.actions.preview')}
                variant="glass"
              />
            </div>
          }
        >
          <div className={styles.miniStats}>
            <span>
              <Trans
                t={t}
                i18nKey="showcase.stats.groups"
                count={8}
                components={{ count: <strong /> }}
              />
            </span>
            <span>
              <Trans
                t={t}
                i18nKey="showcase.stats.mechanics"
                count={3}
                components={{ count: <strong /> }}
              />
            </span>
            <span>
              <Trans
                t={t}
                i18nKey="showcase.stats.dependencies"
                count={0}
                components={{ count: <strong /> }}
              />
            </span>
          </div>
        </Card>

        <Card
          tone="glass"
          title={t('showcase.demos.form.title')}
          description={t('showcase.demos.form.description')}
        >
          <InputMain
            label={t('showcase.demos.form.searchLabel')}
            placeholder={t('showcase.demos.form.searchPlaceholder')}
          />
          <InputMain
            label={t('showcase.demos.form.tokenLabel')}
            placeholder="ui-kit:selected"
            mono
          />
          <div className={styles.formActions}>
            <ButtonMain size="small">{t('showcase.demos.form.apply')}</ButtonMain>
            <ButtonMain size="small" variant="ghost">
              {t('showcase.demos.form.reset')}
            </ButtonMain>
          </div>
        </Card>

        <Card
          tone="accent"
          title={t('showcase.demos.layers.title')}
          description={t('showcase.demos.layers.description')}
        >
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

      <div className={styles.timeline} aria-label={t('showcase.timeline.ariaLabel')}>
        {[
          ['01', 'primitive'],
          ['02', 'composition'],
          ['03', 'pageBlock'],
          ['04', 'route'],
        ].map(([step, key]) => (
          <Card key={step} interactive tone="glass">
            <div className={styles.timelineItem}>
              <Badge tone="accent">{step}</Badge>
              <div>
                <h3>{t(`showcase.timeline.steps.${key}.title`)}</h3>
                <p>{t(`showcase.timeline.steps.${key}.description`)}</p>
              </div>
              <Glyph name="check" />
            </div>
          </Card>
        ))}
      </div>

      <ModalMain
        open={modalOpen}
        title={t('showcase.modal.title')}
        onClose={() => setModalOpen(false)}
      >
        <p className={styles.modalText}>
          {t('showcase.modal.description')}
        </p>
        <div className={styles.modalActions}>
          <ButtonMain onClick={() => setModalOpen(false)}>
            {t('showcase.modal.close')}
          </ButtonMain>
          <ButtonMain
            variant="secondary"
            onClick={() => {
              setModalOpen(false);
              setToastOpen(true);
            }}
          >
            {t('showcase.modal.save')}
          </ButtonMain>
        </div>
      </ModalMain>

      <Toast
        open={toastOpen}
        tone="success"
        title={t('showcase.toast.title')}
        description={t('showcase.toast.description')}
      />
    </section>
  );
}
