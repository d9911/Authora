import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const themeProvider = read('frontend/src/processes/theme/ui/ThemeProvider.tsx');
const loader = read('frontend/src/shared/ui/LoaderMain/LoaderMain.tsx');
const loaderStyles = read('frontend/src/shared/ui/LoaderMain/LoaderMain.module.scss');
const loadingBoundary = read('frontend/src/app/[locale]/loading.tsx');

assert.match(
  themeProvider,
  /const DEFAULT_THEME: ThemeMode = 'light';/,
  'ThemeProvider should render the same default theme on the server and first client pass.',
);
assert.match(
  themeProvider,
  /useState<ThemeMode>\(DEFAULT_THEME\)/,
  'ThemeProvider should not read browser-only theme state in the useState initializer.',
);
assert.doesNotMatch(
  themeProvider,
  /useState<ThemeMode>\(getInitialTheme\)/,
  'Reading localStorage or matchMedia in the initial client render causes hydration text mismatches.',
);
assert.match(
  themeProvider,
  /setHydrated\(true\)/,
  'ThemeProvider should apply DOM theme updates only after it has resolved the browser theme.',
);

assert.match(loader, /fullscreen\?: boolean/);
assert.match(loader, /useId\(\)/);
assert.match(loader, /role="status"/);
assert.match(loader, /aria-live="polite"/);
assert.match(loader, /aria-busy="true"/);
assert.match(loader, /styles\.fullscreen/);
assert.match(loaderStyles, /:global\(:root\[data-theme='dark'\]\)/);
assert.match(loaderStyles, /var\(--paper\)/);
assert.match(loaderStyles, /var\(--iris\)/);
assert.match(loaderStyles, /var\(--halo\)/);
assert.match(loaderStyles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(loadingBoundary, /<LoaderMain fullscreen\s*\/>/);

console.log('Theme hydration checks passed');
