import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { runCommand } from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = path.join(projectRoot, '.test-results', 'build', 'profile-photo');
const result = await runCommand('yarn', ['tsc', '-p', 'tsconfig.profile-photo-tests.json'], {
  cwd: path.join(projectRoot, 'backend'),
});

if (result.signal) {
  console.error(`Profile-photo test compilation was terminated by ${result.signal}`);
  process.exitCode = 1;
} else if (result.exitCode !== 0) {
  process.exitCode = result.exitCode ?? 1;
} else {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, 'package.json'), '{"type":"commonjs"}\n', 'utf8');
}
