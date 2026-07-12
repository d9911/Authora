// Денис: файл создан или изменён по запросу пользователя.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  AlertDialog,
  Avatar,
  Badge,
  ButtonMain,
  Card,
  DropdownMenu,
  FeedbackText,
  IconButton,
  InputMain,
  LoaderMain,
  ModalMain,
  OtpCodeInput,
  PasswordInput,
  ProgressBar,
  RangeControl,
  SectionHeader,
  SelectMain,
  SpatialPreview,
  Tabs,
  Toast,
  ToggleSwitch,
  type SelectOption,
  type TabOption,
} from '@/shared/ui';
import {
  type UiKitCategory,
  type UiKitCatalogStatus,
  uiKitCatalog,
} from '../model/uiKitCatalog';
import styles from './UiKitShowcase.module.scss';

type SelectDemoDensity = 'balanced' | 'compact' | 'spacious';
type SelectDemoCapability = 'keyboard' | 'multiple' | 'placement';
type DemoToastTone = 'success' | 'warning' | 'danger';

const catalogStatusTone: Record<UiKitCatalogStatus, 'success' | 'accent' | 'warning'> = {
  ready: 'success',
  extended: 'accent',
  new: 'warning',
};

function Glyph({ name }: { name: 'spark' | 'check' | 'eye' }) {
  if (name === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.6 16.7 4.9 12l1.5-1.5 3.2 3.2 8-8L19.1 7 9.6 16.7Z" fill="currentColor" />
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
  const [activeTab, setActiveTab] = useState<UiKitCategory>('all');
  const [selectedId, setSelectedId] = useState(uiKitCatalog[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [depth, setDepth] = useState(72);
  const [toastTone, setToastTone] = useState<DemoToastTone | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [selectDensity, setSelectDensity] = useState<SelectDemoDensity | null>('balanced');
  const [selectCapabilities, setSelectCapabilities] = useState<SelectDemoCapability[]>([
    'keyboard',
    'placement',
  ]);

  const catalogPanelId = 'ui-kit-component-catalog';
  const tabs: TabOption<UiKitCategory>[] = [
    { value: 'all', label: t('showcase.tabs.all'), controls: catalogPanelId },
    { value: 'surfaces', label: t('showcase.tabs.surfaces'), controls: catalogPanelId },
    { value: 'actions', label: t('showcase.tabs.actions'), controls: catalogPanelId },
    { value: 'forms', label: t('showcase.tabs.forms'), controls: catalogPanelId },
    { value: 'navigation', label: t('showcase.tabs.navigation'), controls: catalogPanelId },
    { value: 'feedback', label: t('showcase.tabs.feedback'), controls: catalogPanelId },
  ];
  const densityOptions: SelectOption<SelectDemoDensity>[] = [
    { value: 'balanced', label: t('showcase.demos.select.options.balanced') },
    { value: 'compact', label: t('showcase.demos.select.options.compact') },
    { value: 'spacious', label: t('showcase.demos.select.options.spacious') },
  ];
  const capabilityOptions: SelectOption<SelectDemoCapability>[] = [
    { value: 'keyboard', label: t('showcase.demos.select.options.keyboard') },
    { value: 'multiple', label: t('showcase.demos.select.options.multiple') },
    { value: 'placement', label: t('showcase.demos.select.options.placement') },
  ];

  const visibleComponents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    return uiKitCatalog.filter((component) => {
      if (activeTab !== 'all' && component.category !== activeTab) return false;
      if (!normalizedQuery) return true;
      const purpose = t(`showcase.catalog.items.${component.id}.purpose`);
      return `${component.name} ${purpose}`.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [activeTab, searchQuery, t]);

  const selectedComponent =
    visibleComponents.find((component) => component.id === selectedId) ??
    visibleComponents[0] ??
    null;
  const activeTabIndex = Math.max(0, tabs.findIndex((tab) => tab.value === activeTab));
  const selectedTabId = `ui-kit-category-tab-${activeTabIndex}`;

  useEffect(() => {
    if (!toastTone) return;
    const timeout = window.setTimeout(() => setToastTone(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastTone]);

  return (
    <section className={styles.showcase} aria-labelledby="ui-kit-showcase-title">
      <div className={styles.sectionTop}>
        <div id="ui-kit-showcase-title">
          <SectionHeader
            eyebrow={t('showcase.header.eyebrow')}
            title={t('showcase.header.title')}
            description={t('showcase.header.description')}
          />
        </div>
        <Tabs
          idPrefix="ui-kit-category"
          options={tabs}
          value={activeTab}
          onChange={setActiveTab}
          label={t('showcase.accessibility.categories')}
        />
      </div>

      <div
        id={catalogPanelId}
        className={styles.catalogPanel}
        role="tabpanel"
        aria-labelledby={selectedTabId}
        tabIndex={0}
      >
        <InputMain
          label={t('showcase.catalog.searchLabel')}
          placeholder={t('showcase.catalog.searchPlaceholder')}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        <div
          className={`${styles.layout} ${compactMode ? styles.compact : ''} ${selectedComponent ? '' : styles.noSelection}`}
        >
          <div className={styles.catalog} aria-label={t('showcase.accessibility.components')}>
            {visibleComponents.map((component) => {
              const selected = component.id === selectedComponent?.id;
              return (
                <Card
                  key={component.id}
                  selected={selected}
                  tone={selected ? 'glass' : 'plain'}
                  footer={
                    <div className={styles.cardFooter}>
                      <Badge tone={catalogStatusTone[component.status]}>
                        {t(`showcase.catalog.status.${component.status}`)}
                      </Badge>
                      <span>{t(`showcase.categories.${component.category}`)}</span>
                    </div>
                  }
                >
                  <button
                    type="button"
                    className={styles.componentButton}
                    aria-pressed={selected}
                    onClick={() => setSelectedId(component.id)}
                  >
                    <strong>{component.name}</strong>
                    <span>{t(`showcase.catalog.items.${component.id}.purpose`)}</span>
                  </button>
                </Card>
              );
            })}
            {visibleComponents.length === 0 ? (
              <FeedbackText className={styles.emptyCatalog} tone="muted" role="status" aria-live="polite">
                {t('showcase.catalog.noResults')}
              </FeedbackText>
            ) : null}
          </div>

          {selectedComponent ? (
            <aside className={styles.inspector} aria-label={t('showcase.accessibility.selectedPreview')}>
              <Card
              tone="dark"
              title={selectedComponent.name}
              description={t(`showcase.catalog.items.${selectedComponent.id}.purpose`)}
              eyebrow={t('showcase.selected')}
              footer={
                <div className={styles.layerLine}>
                  <Badge tone="accent" variant="outline">{'@/shared/ui'}</Badge>
                  <Badge tone={catalogStatusTone[selectedComponent.status]}>
                    {t(`showcase.catalog.status.${selectedComponent.status}`)}
                  </Badge>
                </div>
              }
            >
              <dl className={styles.componentMeta}>
                <div>
                  <dt>{t('showcase.catalog.importLabel')}</dt>
                  <dd><code>{`import { ${selectedComponent.name} } from '@/shared/ui'`}</code></dd>
                </div>
                <div>
                  <dt>{t('showcase.catalog.apiLabel')}</dt>
                  <dd><code>{selectedComponent.api}</code></dd>
                </div>
                <div>
                  <dt>{t('showcase.catalog.a11yLabel')}</dt>
                  <dd>{t(`showcase.catalog.a11y.${selectedComponent.a11y}`)}</dd>
                </div>
              </dl>
              <SpatialPreview
                active={motionEnabled}
                density={compactMode ? 'calm' : 'rich'}
                style={{ minHeight: `${Math.max(180, depth * 2.4)}px` }}
              />
              </Card>

              <Card tone="glass" title={t('showcase.controls.title')} description={t('showcase.controls.description')}>
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
          ) : null}
        </div>
      </div>

      <div className={styles.demoGrid}>
        <Card tone="plain" title={t('showcase.demos.actions.title')} description={t('showcase.demos.actions.description')}>
          <div className={styles.actionRow}>
            <ButtonMain onClick={() => setToastTone('success')}>
              {t('showcase.demos.actions.showToast')}
            </ButtonMain>
            <ButtonMain variant="secondary" onClick={() => setModalOpen(true)}>
              {t('showcase.demos.actions.openModal')}
            </ButtonMain>
            <ButtonMain loading>{t('showcase.demos.actions.loading')}</ButtonMain>
            <ButtonMain disabled variant="ghost">{t('showcase.demos.actions.disabled')}</ButtonMain>
            <IconButton
              icon={<Glyph name="spark" />}
              label={t('showcase.demos.actions.generate')}
              variant="accent"
              onClick={() => setToastTone('warning')}
            />
            <IconButton
              icon={<Glyph name="eye" />}
              label={t('showcase.demos.actions.preview')}
              variant="glass"
              onClick={() => setModalOpen(true)}
            />
          </div>
        </Card>

        <Card tone="glass" title={t('showcase.demos.form.title')} description={t('showcase.demos.form.description')}>
          <InputMain
            label={t('showcase.demos.form.errorLabel')}
            hint={t('showcase.demos.form.hint')}
            error={t('showcase.demos.form.errorMessage')}
            required
            requiredLabel={t('showcase.demos.form.required')}
            value="invalid-token"
            readOnly
            mono
          />
          <PasswordInput label={t('showcase.demos.form.passwordLabel')} value="identity-aura" disabled readOnly />
          <OtpCodeInput
            label={t('showcase.demos.form.otpLabel')}
            value={otpCode}
            onValueChange={setOtpCode}
            aria-label={t('showcase.demos.form.otpLabel')}
            placeholder="000000"
            mono
          />
          <div className={styles.feedbackStack}>
            <FeedbackText tone="success">{t('showcase.demos.form.success')}</FeedbackText>
            <FeedbackText tone="warning">{t('showcase.demos.form.warning')}</FeedbackText>
          </div>
        </Card>

        <Card tone="plain" title={t('showcase.demos.select.title')} description={t('showcase.demos.select.description')}>
          <SelectMain
            label={t('showcase.demos.select.singleLabel')}
            placeholder={t('showcase.demos.select.singlePlaceholder')}
            options={densityOptions}
            value={selectDensity}
            clearable
            onChange={setSelectDensity}
          />
          <SelectMain
            multiple
            label={t('showcase.demos.select.multiLabel')}
            placeholder={t('showcase.demos.select.multiPlaceholder')}
            options={capabilityOptions}
            value={selectCapabilities}
            clearable
            onChange={setSelectCapabilities}
          />
        </Card>

        <Card tone="plain" title={t('showcase.demos.menu.title')} description={t('showcase.demos.menu.description')}>
          <DropdownMenu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            align="start"
            renderTrigger={(triggerProps) => (
              <button {...triggerProps} className={styles.menuTrigger}>
                {t('showcase.demos.menu.trigger')}
              </button>
            )}
          >
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => setToastTone('success')}>
              {t('showcase.demos.menu.primary')}
            </button>
            <button type="button" role="menuitem" tabIndex={-1} onClick={() => setToastTone('warning')}>
              {t('showcase.demos.menu.secondary')}
            </button>
            <button type="button" role="menuitem" tabIndex={-1} aria-disabled="true">
              {t('showcase.demos.menu.disabled')}
            </button>
          </DropdownMenu>
          <p className={styles.demoNote}>{t('showcase.demos.menu.keyboardNote')}</p>
        </Card>

        <Card tone="plain" title={t('showcase.demos.identity.title')} description={t('showcase.demos.identity.description')}>
          <div className={styles.identityRow}>
            <Avatar src={null} alt={t('showcase.demos.identity.avatarAlt')} fallback="AU" size="large" />
            <Avatar src={null} alt="" fallback="ID" size="default" decorative />
            <Badge tone="success">{t('showcase.demos.identity.verified')}</Badge>
            <Badge tone="warning">{t('showcase.demos.identity.pending')}</Badge>
            <Badge tone="danger">{t('showcase.demos.identity.blocked')}</Badge>
          </div>
          <LoaderMain label={t('showcase.demos.identity.loading')} />
        </Card>

        <Card tone="accent" title={t('showcase.demos.overlays.title')} description={t('showcase.demos.overlays.description')}>
          <div className={styles.actionRow}>
            <ButtonMain variant="secondary" onClick={() => setModalOpen(true)}>
              {t('showcase.demos.actions.openModal')}
            </ButtonMain>
            <ButtonMain variant="danger" onClick={() => setAlertOpen(true)}>
              {t('showcase.demos.overlays.openAlert')}
            </ButtonMain>
            <ButtonMain variant="secondary" onClick={() => setToastTone('danger')}>
              {t('showcase.demos.overlays.errorToast')}
            </ButtonMain>
          </div>
        </Card>
      </div>

      <div className={styles.miniStats}>
        <span>
          <Trans t={t} i18nKey="showcase.stats.groups" count={uiKitCatalog.length} components={{ count: <strong /> }} />
        </span>
        <span>
          <Trans t={t} i18nKey="showcase.stats.mechanics" count={3} components={{ count: <strong /> }} />
        </span>
        <span>
          <Trans t={t} i18nKey="showcase.stats.dependencies" count={0} components={{ count: <strong /> }} />
        </span>
      </div>

      <div className={styles.timeline} aria-label={t('showcase.timeline.ariaLabel')}>
        {[
          ['01', 'primitive'],
          ['02', 'composition'],
          ['03', 'pageBlock'],
          ['04', 'route'],
        ].map(([step, key]) => (
          <Card key={step} tone="glass">
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
        closeLabel={t('showcase.modal.close')}
        descriptionId="ui-kit-modal-description"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <ButtonMain variant="secondary" onClick={() => setModalOpen(false)}>
              {t('showcase.modal.close')}
            </ButtonMain>
            <ButtonMain
              onClick={() => {
                setModalOpen(false);
                setToastTone('success');
              }}
            >
              {t('showcase.modal.save')}
            </ButtonMain>
          </>
        }
      >
        <p id="ui-kit-modal-description" className={styles.modalText}>
          {t('showcase.modal.description')}
        </p>
      </ModalMain>

      <AlertDialog
        open={alertOpen}
        title={t('showcase.alertDialog.title')}
        description={t('showcase.alertDialog.description')}
        cancelLabel={t('showcase.alertDialog.cancel')}
        confirmLabel={t('showcase.alertDialog.confirm')}
        onCancel={() => setAlertOpen(false)}
        onConfirm={() => {
          setAlertOpen(false);
          setToastTone('danger');
        }}
      />

      <Toast
        open={toastTone !== null}
        tone={toastTone ?? 'success'}
        title={t(`showcase.toast.${toastTone ?? 'success'}.title`)}
        description={t(`showcase.toast.${toastTone ?? 'success'}.description`)}
        closeLabel={t('showcase.toast.close')}
        onClose={() => setToastTone(null)}
      />
    </section>
  );
}
