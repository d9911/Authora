import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(root, 'frontend/src');

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const checks = [
  {
    dir: 'shared',
    forbidden: /@\/(app|processes|widgets|features|entities)\//,
    message: '`shared` must not import app/processes/widgets/features/entities layers.',
  },
  {
    dir: 'entities',
    forbidden: /@\/(app|processes|widgets|features)\//,
    message: '`entities` must not import app/processes/widgets/features layers.',
  },
  {
    dir: 'features',
    forbidden: /@\/(app|widgets)\//,
    message: '`features` must not import app/widgets layers.',
  },
];

const violations = [];

for (const check of checks) {
  for (const file of collectFiles(resolve(srcRoot, check.dir))) {
    const source = readFileSync(file, 'utf8');
    if (check.forbidden.test(source)) {
      violations.push(`${relative(root, file)}: ${check.message}`);
    }
  }
}

assert.deepEqual(violations, []);
