import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const header = read('frontend/src/widgets/HeaderMain/HeaderMain.tsx');
const styles = read('frontend/src/widgets/HeaderMain/HeaderMain.module.scss');

assert.match(header, /header-desktop-auth/);
assert.match(header, /header-mobile-auth/);
assert.match(styles, /\.header-mobile-auth\s*\{\s*display:\s*none/);
assert.match(
  styles,
  /@include media\(sm\)[\s\S]*\.header-desktop-auth\s*\{\s*display:\s*none/,
);
assert.match(
  styles,
  /@include media\(sm\)[\s\S]*\.header-mobile-auth\s*\{\s*display:\s*flex/,
);

console.log('i18n mobile header contract checks passed');
