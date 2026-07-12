import { spawn } from 'node:child_process';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { findFreePort } from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const backendRoot = path.join(projectRoot, 'backend');
const outputRoot = path.join(projectRoot, '.test-results/build/mongo-smoke');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: options.env ?? process.env,
      shell: false,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (exitCode, signal) => {
      if (signal) reject(new Error(`${command} was terminated by ${signal}`));
      else if (exitCode !== 0) reject(new Error(`${command} exited with ${exitCode}`));
      else resolve();
    });
  });
}

try {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await run(
    path.join(backendRoot, 'node_modules/.bin/tsc'),
    [
      path.join(backendRoot, 'smoke-test.ts'),
      '--ignoreConfig',
      '--target',
      'ES2022',
      '--module',
      'node16',
      '--moduleResolution',
      'node16',
      '--esModuleInterop',
      '--skipLibCheck',
      '--outDir',
      outputRoot,
      '--rootDir',
      backendRoot,
      '--noEmitOnError',
    ],
    { cwd: backendRoot },
  );
  await writeFile(path.join(outputRoot, 'package.json'), '{"type":"commonjs"}\n', 'utf8');
  await symlink(path.join(backendRoot, 'node_modules'), path.join(outputRoot, 'node_modules'), 'dir');
  const port = await findFreePort();
  await run(process.execPath, [path.join(outputRoot, 'smoke-test.js')], {
    cwd: outputRoot,
    env: {
      ...process.env,
      MONGO_SMOKE_PORT: String(port),
      NODE_PATH: path.join(backendRoot, 'node_modules'),
      NODE_ENV: 'test',
      RATE_LIMIT_MAX: '100000',
      AUTH_RATE_LIMIT_MAX: '100000',
      AUTH_IDENTIFIER_RATE_LIMIT_MAX: '100000',
      SMTP_USER: '',
      SMTP_PASS: '',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_BOT_URL: '',
    },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
