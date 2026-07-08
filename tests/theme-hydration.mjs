import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const themeProvider = read('frontend/src/processes/theme/ui/ThemeProvider.tsx');

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

console.log('Theme hydration checks passed');
