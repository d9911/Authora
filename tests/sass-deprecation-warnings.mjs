import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../frontend/src', import.meta.url).pathname;

function collectScssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectScssFiles(path);
    return entry.isFile() && entry.name.endsWith('.scss') ? [path] : [];
  });
}

const failures = [];

for (const file of collectScssFiles(root)) {
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file);

  if (/^\s*@import\s/m.test(source)) {
    failures.push(`${label}: replace deprecated Sass @import with @use or sass:meta.load-css`);
  }

  if (/\bmap-(?:get|has-key)\s*\(/.test(source)) {
    failures.push(`${label}: replace deprecated global map functions with sass:map functions`);
  }
}

if (failures.length > 0) {
  console.error('Sass deprecation checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sass deprecation checks passed');
