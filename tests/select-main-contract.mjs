// Денис: файл создан или изменён по запросу пользователя.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const component = read('frontend/src/shared/ui/SelectMain/SelectMain.tsx');
const styles = read('frontend/src/shared/ui/SelectMain/SelectMain.module.scss');
const barrel = read('frontend/src/shared/ui/index.ts');
const showcase = read('frontend/src/entities/ui-kit/ui/UiKitShowcase.tsx');
const ruUi = JSON.parse(read('frontend/src/locales/ru/ui.json'));
const enUi = JSON.parse(read('frontend/src/locales/en/ui.json'));
const ruCommon = JSON.parse(read('frontend/src/locales/ru/common.json'));
const enCommon = JSON.parse(read('frontend/src/locales/en/common.json'));
const locationSelects = read('frontend/src/features/EditProfileForm/LocationSelectGroup.tsx');
const languageSwitcher = read('frontend/src/features/LanguageSwitcher/LanguageSwitcher.tsx');
const header = read('frontend/src/widgets/HeaderMain/HeaderMain.tsx');
const dropdownMenu = read('frontend/src/shared/ui/DropdownMenu/DropdownMenu.tsx');

assert.match(component, /multiple\?: false/);
assert.match(component, /multiple: true/);
assert.match(component, /type SelectMainAccessibleName/);
assert.match(component, /\{ label: string; ariaLabel\?: string \}/);
assert.match(component, /\{ label\?: undefined; ariaLabel: string \}/);
assert.match(component, /value: T \| null/);
assert.match(component, /value: readonly T\[\]/);
assert.match(component, /createPortal/);
assert.match(component, /role=\{multiple \? undefined : 'combobox'\}/);
assert.match(component, /role="listbox"/);
assert.match(component, /role="option"/);
assert.match(component, /aria-activedescendant/);
assert.match(component, /aria-multiselectable/);
assert.match(component, /aria-selected/);
assert.match(component, /ResizeObserver/);
assert.match(component, /visualViewport/);
assert.match(component, /pointerdown/);
assert.match(component, /addEventListener\('scroll'/);
assert.match(component, /addEventListener\('resize'/);
assert.match(component, /removeEventListener\('scroll'/);
assert.match(component, /removeEventListener\('resize'/);
assert.match(component, /window\.visualViewport\?\.width \?\? window\.innerWidth/);
assert.match(component, /window\.visualViewport\?\.height \?\? window\.innerHeight/);
assert.match(component, /optionsStateKey/);
assert.match(component, /aria-selected=\{selected\}/);
assert.doesNotMatch(component, /aria-selected=\{multiple \? selected : active\}/);
assert.match(
  component,
  /if \(multiple\) \{[\s\S]*?props\.onChange\(\[\]\);[\s\S]*?listboxRef\.current\?\.focus/,
);
assert.match(component, /props\.onChange\(null\);\s+closeMenu\(true\)/);

assert.match(styles, /position: fixed/);
assert.match(styles, /var\(--paper\)/);
assert.match(styles, /var\(--card\)/);
assert.match(styles, /var\(--ink\)/);
assert.match(styles, /var\(--iris\)/);
assert.match(styles, /var\(--line\)/);
assert.match(styles, /z-index: 1100/);
assert.match(styles, /\[data-placement='top'\]/);

assert.match(barrel, /export \{ SelectMain \} from '\.\/SelectMain\/SelectMain'/);
assert.match(barrel, /export type \{ SelectOption, SelectMainProps \}/);

assert.ok(
  [...showcase.matchAll(/<SelectMain/g)].length >= 2,
  'UI-kit showcase should render both single and multi SelectMain examples',
);
assert.match(showcase, /multiple/);
assert.equal(typeof ruUi.showcase.demos.select.singleLabel, 'string');
assert.equal(typeof enUi.showcase.demos.select.singleLabel, 'string');
assert.equal(typeof ruUi.showcase.demos.select.multiLabel, 'string');
assert.equal(typeof enUi.showcase.demos.select.multiLabel, 'string');
assert.equal(typeof ruCommon.select.clear, 'string');
assert.equal(typeof enCommon.select.clear, 'string');
assert.equal(typeof ruCommon.select.removeOption, 'string');
assert.equal(typeof enCommon.select.removeOption, 'string');

assert.doesNotMatch(locationSelects, /<select\b/);
assert.doesNotMatch(languageSwitcher, /<select\b/);
assert.match(locationSelects, /<SelectMain/);
assert.match(languageSwitcher, /<SelectMain/);
assert.match(locationSelects, /value=\{value \|\| null\}/);
assert.match(locationSelects, /onChange=\{\(nextValue\) => onChange\(nextValue \?\? ''\)\}/);
assert.match(
  locationSelects,
  /<SelectMain[\s\S]*?clearable[\s\S]*?onChange=\{\(nextValue\) => onChange\(nextValue \?\? ''\)\}/,
);
assert.match(languageSwitcher, /variant="compact"/);
assert.match(languageSwitcher, /if \(!nextLocale \|\| nextLocale === locale\) return/);
assert.match(header, /<DropdownMenu/);
assert.match(header, /role="menuitem"/);
assert.match(dropdownMenu, /role="menu"/);
assert.match(dropdownMenu, /aria-haspopup': 'menu'/);

console.log('SelectMain component contract checks passed');
