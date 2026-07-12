// Денис: файл создан или изменён по запросу пользователя.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

function relativeLuminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

function compositeHex(foreground, background, alpha) {
  const channels = (hex) =>
    hex
      .replace('#', '')
      .match(/.{2}/g)
      .map((channel) => Number.parseInt(channel, 16));
  const foregroundChannels = channels(foreground);
  const backgroundChannels = channels(background);
  const result = foregroundChannels.map((channel, index) =>
    Math.round(channel * alpha + backgroundChannels[index] * (1 - alpha)),
  );
  return `#${result.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function readHexToken(block, token, theme) {
  const value = block.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  assert.ok(value, `${theme} ${token} must be a six-digit hex color`);
  return value;
}

test('declares contrast-safe semantic action and status pairs', async () => {
  const globals = await source('frontend/src/shared/styles/globals.scss');
  const light = globals.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
  const dark = globals.match(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light, 'light theme token block must exist');
  assert.ok(dark, 'dark theme token block must exist');

  const pairs = [
    ['light', light, '--on-action', '--action-accent'],
    ['light', light, '--on-action', '--action-accent-hover'],
    ['light', light, '--on-action', '--action-danger'],
    ['light', light, '--accent-text', '--card'],
    ['light', light, '--status-success-text', '--card'],
    ['light', light, '--status-danger-text', '--card'],
    ['light', light, '--status-warning-text', '--card'],
    ['dark', dark, '--on-action', '--action-accent'],
    ['dark', dark, '--on-action', '--action-accent-hover'],
    ['dark', dark, '--on-action', '--action-danger'],
    ['dark', dark, '--accent-text', '--card'],
    ['dark', dark, '--status-success-text', '--card'],
    ['dark', dark, '--status-danger-text', '--card'],
    ['dark', dark, '--status-warning-text', '--card'],
  ];

  for (const [theme, block, foregroundToken, backgroundToken] of pairs) {
    const foreground = readHexToken(block, foregroundToken, theme);
    const background = readHexToken(block, backgroundToken, theme);
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${theme} ${foregroundToken} ${foreground} on ${backgroundToken} ${background} must meet 4.5:1`,
    );
  }
});

test('wires non-text contrast, focus, link and composited accent safeguards', async () => {
  const [globals, input, password, tabs, dropdown, card] = await Promise.all([
    source('frontend/src/shared/styles/globals.scss'),
    source('frontend/src/shared/ui/InputMain/InputMain.module.scss'),
    source('frontend/src/shared/ui/PasswordInput/PasswordInput.module.scss'),
    source('frontend/src/shared/ui/Tabs/Tabs.module.scss'),
    source('frontend/src/shared/ui/DropdownMenu/DropdownMenu.module.scss'),
    source('frontend/src/shared/ui/Card/Card.module.scss'),
  ]);
  const light = globals.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
  const dark = globals.match(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(light && dark);

  const nonTextPairs = [
    ['light control/paper', readHexToken(light, '--control-border', 'light'), readHexToken(light, '--paper', 'light')],
    ['light control/card', readHexToken(light, '--control-border', 'light'), readHexToken(light, '--card', 'light')],
    ['dark control/paper', readHexToken(dark, '--control-border', 'dark'), readHexToken(dark, '--paper', 'dark')],
    ['dark control/card', readHexToken(dark, '--control-border', 'dark'), readHexToken(dark, '--card', 'dark')],
    ['light selected edge', readHexToken(light, '--selection-edge', 'light'), readHexToken(light, '--card', 'light')],
    ['dark selected edge', readHexToken(dark, '--selection-edge', 'dark'), readHexToken(dark, '--card', 'dark')],
    ['light menu focus', readHexToken(light, '--iris', 'light'), readHexToken(light, '--card', 'light')],
    ['dark menu focus', readHexToken(dark, '--iris', 'dark'), readHexToken(dark, '--card', 'dark')],
  ];
  for (const [label, foreground, background] of nonTextPairs) {
    assert.ok(
      contrastRatio(foreground, background) >= 3,
      `${label} (${foreground} / ${background}) must meet 3:1`,
    );
  }

  assert.match(input, /border:\s*1px solid var\(--control-border\)/);
  assert.match(password, /border:\s*1px solid var\(--control-border\)/);
  assert.match(tabs, /inset 0 0 0 2px var\(--selection-edge\)/);
  assert.match(dropdown, /position:\s*fixed/);
  assert.match(dropdown, /outline:\s*2px solid var\(--iris\)/);
  assert.match(globals, /a\s*\{[\s\S]*?text-decoration:\s*underline/);

  const accentCard = card.match(/\.tone-accent\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(accentCard, 'accent card styles must exist');
  const overlay = accentCard.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*(0?\.\d+)\)/);
  assert.ok(overlay, 'accent card radial overlay must be an rgba color');
  const overlayHex = `#${overlay
    .slice(1, 4)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`;
  const overlayAlpha = Number(overlay[4]);
  const onAction = readHexToken(light, '--on-action', 'light');
  const gradientEndpoints = [readHexToken(light, '--action-accent', 'light'), '#3226bf'];
  for (const endpoint of gradientEndpoints) {
    const composite = compositeHex(overlayHex, endpoint, overlayAlpha);
    assert.ok(
      contrastRatio(onAction, composite) >= 4.5,
      `accent card ${onAction} on composited ${composite} must meet 4.5:1`,
    );
  }
});

test('extends form and action primitives without breaking native contracts', async () => {
  const [button, input, password, feedback] = await Promise.all([
    source('frontend/src/shared/ui/ButtonMain/ButtonMain.tsx'),
    source('frontend/src/shared/ui/InputMain/InputMain.tsx'),
    source('frontend/src/shared/ui/PasswordInput/PasswordInput.tsx'),
    source('frontend/src/shared/ui/FeedbackText/FeedbackText.tsx'),
  ]);

  assert.match(button, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(button, /href/);
  assert.match(button, /<Link/);
  const inactiveBranch = button.match(/if \(inactive\) \{([\s\S]*?)\n\s*\}/)?.[1];
  assert.ok(inactiveBranch, 'inactive link branch must exist');
  assert.match(inactiveBranch, /<span/);
  assert.doesNotMatch(inactiveBranch, /href=/);
  assert.match(input, /useId/);
  assert.match(input, /aria-invalid=\{error \? true/);
  assert.match(input, /aria-describedby/);
  assert.match(input, /field-error/);
  assert.match(password, /forwardRef/);
  assert.match(password, /disabled=\{rest\.disabled\}/);
  assert.match(password, /\[rest\['aria-describedby'\], error \? errorId : null\]/);
  assert.match(password, /role="alert"/);
  assert.match(feedback, /tone === 'success' \|\| tone === 'warning'/);
  assert.match(feedback, /aria-live/);
});

test('implements the modal dialog accessibility lifecycle', async () => {
  const modal = await source('frontend/src/shared/ui/ModalMain/ModalMain.tsx');

  assert.match(modal, /createPortal/);
  assert.match(modal, /role=\{role\}/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby/);
  assert.match(modal, /event\.key === 'Escape'/);
  assert.match(modal, /event\.key !== 'Tab'/);
  assert.match(modal, /previouslyFocused/);
  assert.match(modal, /document\.body\.style\.overflow/);
  assert.match(modal, /element\.inert = element !== topModal\.overlay/);
  assert.match(modal, /element\.inert = wasInert/);
  assert.match(modal, /const modalStack:/);
  assert.match(modal, /getTopModal\(\)/);
  assert.match(modal, /modalStack\.splice/);
  assert.match(modal, /initiallyFocused/);
});

test('exports accessible DropdownMenu, AlertDialog and Avatar primitives', async () => {
  const [menu, menuModel, alertDialog, avatar, publicApi] = await Promise.all([
    source('frontend/src/shared/ui/DropdownMenu/DropdownMenu.tsx'),
    source('frontend/src/shared/ui/DropdownMenu/dropdownMenuModel.ts'),
    source('frontend/src/shared/ui/AlertDialog/AlertDialog.tsx'),
    source('frontend/src/shared/ui/Avatar/Avatar.tsx'),
    source('frontend/src/shared/ui/index.ts'),
  ]);

  assert.match(menu, /aria-haspopup="menu"/);
  assert.match(menu, /aria-expanded/);
  assert.match(menu, /role="menu"/);
  assert.match(menu, /createPortal/);
  assert.match(menu, /menuRef\.current\?\.contains\(target\)/);
  assert.match(menu, /data-positioned/);
  assert.match(menu, /ArrowDown/);
  assert.match(menu, /Home/);
  assert.match(menu, /End/);
  assert.match(menuModel, /resolveDropdownPlacement/);
  assert.match(menuModel, /getNextMenuItemIndex/);
  assert.match(menuModel, /viewportTop/);
  assert.match(alertDialog, /role="alertdialog"/);
  assert.match(alertDialog, /busy/);
  assert.match(avatar, /decorative/);
  assert.match(avatar, /fallback/);
  assert.match(publicApi, /DropdownMenu/);
  assert.match(publicApi, /AlertDialog/);
  assert.match(publicApi, /Avatar/);
});

test('implements roving tabs and safe toast semantics', async () => {
  const [tabs, tabsModel, toast] = await Promise.all([
    source('frontend/src/shared/ui/Tabs/Tabs.tsx'),
    source('frontend/src/shared/ui/Tabs/tabsModel.ts'),
    source('frontend/src/shared/ui/Toast/Toast.tsx'),
  ]);

  assert.match(tabs, /tabIndex=\{active \? 0 : -1\}/);
  assert.match(tabs, /aria-controls=\{option\.controls\}/);
  assert.match(tabs, /ArrowRight/);
  assert.match(tabs, /Home/);
  assert.match(tabsModel, /getNextTabIndex/);
  assert.match(tabs, /scrollIntoView/);
  assert.match(toast, /if \(!open\) return null/);
  assert.match(toast, /tone === 'danger' \? 'alert' : 'status'/);
  assert.match(toast, /closeLabel/);
});

test('migrates confirmed consumers without changing feature callbacks', async () => {
  const [header, headerStyles, profileManager, uploader, profileCard, profileCardStyles, connectedAccounts, showcase, showcasePageStyles, catalog] = await Promise.all([
    source('frontend/src/widgets/HeaderMain/HeaderMain.tsx'),
    source('frontend/src/widgets/HeaderMain/HeaderMain.module.scss'),
    source('frontend/src/features/ProfilePhotoManager/ui/ProfilePhotoManager.tsx'),
    source('frontend/src/features/ProfilePhotoManager/ui/ProfileImageUploaderPanel.tsx'),
    source('frontend/src/widgets/ProfileCard/ProfileCard.tsx'),
    source('frontend/src/widgets/ProfileCard/ProfileCard.module.scss'),
    source('frontend/src/features/ConnectedAccounts/ConnectedAccounts.tsx'),
    source('frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx'),
    source('frontend/src/widgets/page-blocks/UiKitPage/ui/UiKitPage.module.scss'),
    source('frontend/src/entities/ui-kit/model/uiKitCatalog.ts'),
  ]);

  assert.match(header, /DropdownMenu/);
  assert.match(header, /Avatar/);
  assert.match(header, /aria-expanded=\{mobileOpen\}/);
  assert.match(header, /aria-controls=\{navigationId\}/);
  assert.match(header, /aria-label=\{config\.appName\}/);
  assert.match(headerStyles, /\.account-label[\s\S]*?text-overflow:\s*ellipsis/);
  assert.doesNotMatch(header, /<Link[^>]*>\s*<ButtonMain/);
  assert.match(profileManager, /AlertDialog/);
  assert.doesNotMatch(profileManager, /window\.confirm/);
  assert.match(profileManager, /deleteProfileImageThunk\(kind\)/);
  assert.match(profileCard, /<Avatar/);
  assert.match(profileCard, /<Badge/);
  assert.match(profileCardStyles, /\.profile-email[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(uploader, /tabIndex=\{-1\}/);
  assert.match(uploader, /disabled=\{busy\}/);
  assert.match(connectedAccounts, /<Badge/);
  assert.match(showcase, /id="ui-kit-showcase-title"/);
  assert.match(showcase, /role="tabpanel"/);
  assert.match(showcase, /visibleComponents\[0\] \?\?\s*null/);
  assert.match(showcase, /selectedComponent \? \(/);
  assert.match(showcase, /DropdownMenu/);
  assert.match(showcase, /AlertDialog/);
  assert.match(showcase, /Avatar/);
  assert.match(showcasePageStyles, /\.heroCopy,[\s\S]*?\.heroVisual[\s\S]*?min-width:\s*0/);
  assert.match(showcasePageStyles, /\.title[\s\S]*?hyphens:\s*auto[\s\S]*?overflow-wrap:\s*break-word/);
  assert.match(catalog, /renderTrigger · align/);
  assert.doesNotMatch(catalog, /trigger · align · placement/);
  assert.match(catalog, /theme · label · native button props/);
});

test('menu visits disabled items, tabs skip them, and placement uses the visual viewport', async () => {
  const [{ getNextMenuItemIndex, resolveDropdownPlacement }, { getNextTabIndex }] =
    await Promise.all([
      import('../frontend/src/shared/ui/DropdownMenu/dropdownMenuModel.ts'),
      import('../frontend/src/shared/ui/Tabs/tabsModel.ts'),
    ]);

  assert.deepEqual(
    resolveDropdownPlacement({
      triggerTop: 640,
      triggerBottom: 680,
      menuHeight: 240,
      viewportHeight: 720,
    }),
    { placement: 'top', availableHeight: 624 },
  );
  assert.deepEqual(
    resolveDropdownPlacement({
      triggerTop: 40,
      triggerBottom: 80,
      menuHeight: 160,
      viewportHeight: 720,
    }),
    { placement: 'bottom', availableHeight: 624 },
  );
  assert.deepEqual(
    resolveDropdownPlacement({
      triggerTop: 540,
      triggerBottom: 580,
      menuHeight: 200,
      viewportHeight: 300,
      viewportTop: 400,
    }),
    { placement: 'top', availableHeight: 124 },
  );

  const states = [{ disabled: false }, { disabled: true }, { disabled: false }];
  assert.equal(getNextMenuItemIndex(states, 0, 1), 1);
  assert.equal(getNextMenuItemIndex(states, 1, 1), 2);
  assert.equal(getNextMenuItemIndex(states, 2, 1), 0);
  assert.equal(getNextMenuItemIndex(states, 0, -1), 2);
  assert.equal(getNextTabIndex(states, 0, 1), 2);
  assert.equal(getNextTabIndex(states, 2, 1), 0);
  assert.equal(getNextTabIndex(states, 0, -1), 2);
});
