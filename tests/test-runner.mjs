import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { sourceChecks } from './source-checks.mjs';
import { runSuite } from './test-runner-core.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const backendRoot = path.join(projectRoot, 'backend');
const backendRequire = createRequire(path.join(backendRoot, 'package.json'));

async function resolveExecutable(name, env = process.env) {
  const pathEntries = (env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? (env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';')
    : [''];
  for (const directory of pathEntries) {
    for (const extension of extensions) {
      const candidate = path.resolve(directory, `${name}${extension}`);
      try {
        await access(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // Keep searching PATH.
      }
    }
  }
  return null;
}

function canResolveFromBackend(moduleName) {
  try {
    backendRequire.resolve(moduleName);
    return true;
  } catch {
    return false;
  }
}

function optionalCheck(check, available, skip) {
  return available ? check : { ...check, skip };
}

export async function createProjectChecks(env = process.env) {
  const k6Path = await resolveExecutable('k6', env);
  const hasAutocannon = canResolveFromBackend('autocannon');
  const hasMongoMemoryServer = canResolveFromBackend('mongodb-memory-server');
  const nodePath = path.join(backendRoot, 'node_modules');

  const checks = [
    {
      id: 'runner-tests',
      label: 'Test runner tests',
      command: process.execPath,
      args: ['--test', 'tests/test-runner.test.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 30_000,
    },
    ...sourceChecks,
    {
      id: 'doc-mongo-fallback',
      label: 'doc-mongo Makefile fallback',
      command: 'node',
      args: ['tests/doc-mongo-makefile-fallback.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 60_000,
    },
    {
      id: 'backend-types',
      label: 'Backend TypeScript',
      command: 'yarn',
      args: ['run', 'typecheck'],
      cwd: 'backend',
      required: true,
      timeoutMs: 120_000,
    },
    {
      id: 'frontend-types',
      label: 'Frontend TypeScript',
      command: 'yarn',
      args: ['run', 'typecheck'],
      cwd: 'frontend',
      required: true,
      timeoutMs: 120_000,
    },
    {
      id: 'backend-build',
      label: 'Backend build',
      command: 'yarn',
      args: ['run', 'build'],
      cwd: 'backend',
      required: true,
      timeoutMs: 120_000,
      postconditions: [{ path: 'backend/dist/app/server.js', type: 'file' }],
    },
    {
      id: 'mail-templates',
      label: 'Mail service templates',
      command: 'node',
      args: ['tests/mail-service-templates.test.cjs'],
      cwd: 'backend',
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['backend-build'],
    },
    {
      id: 'account-recovery-use-cases',
      label: 'Account recovery use cases',
      command: 'node',
      args: ['tests/account-recovery-use-cases.test.cjs'],
      cwd: 'backend',
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['backend-build'],
    },
    {
      id: 'telegram-recovery-ticket',
      label: 'Telegram recovery ticket',
      command: 'node',
      args: ['tests/telegram-recovery-ticket.test.cjs'],
      cwd: 'backend',
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['backend-build'],
    },
    {
      id: 'sqlite-smoke-compile',
      label: 'SQLite smoke compile',
      command: 'yarn',
      args: ['run', 'test:smoke:compile'],
      cwd: 'backend',
      required: true,
      timeoutMs: 120_000,
      postconditions: [{ path: 'backend/.smoke-dist/smoke-test-sqlite.js', type: 'file' }],
    },
    {
      id: 'telegram-ticket-repository',
      label: 'Telegram ticket repository',
      command: 'node',
      args: ['tests/telegram-ticket-repository.test.cjs'],
      cwd: 'backend',
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['sqlite-smoke-compile'],
    },
    {
      id: 'sqlite-graphql-smoke',
      label: 'SQLite GraphQL smoke',
      command: 'node',
      args: ['.smoke-dist/smoke-test-sqlite.js'],
      cwd: 'backend',
      required: true,
      timeoutMs: 120_000,
      dependsOn: ['sqlite-smoke-compile'],
    },
    {
      id: 'profile-photo-compile',
      label: 'Profile-photo test compile',
      command: 'node',
      args: ['tests/compile-profile-photo-tests.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 120_000,
      postconditions: [
        { path: '.test-results/build/profile-photo/tests/profile-photo-processor.test.js', type: 'file' },
        { path: '.test-results/build/profile-photo/tests/profile-photo-use-cases.test.js', type: 'file' },
      ],
    },
    {
      id: 'profile-photo-processor',
      label: 'Profile image processor',
      command: 'node',
      args: ['.test-results/build/profile-photo/tests/profile-photo-processor.test.js'],
      cwd: '.',
      env: { NODE_PATH: nodePath },
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['profile-photo-compile'],
    },
    {
      id: 'profile-photo-use-cases',
      label: 'Profile photo use cases',
      command: 'node',
      args: ['.test-results/build/profile-photo/tests/profile-photo-use-cases.test.js'],
      cwd: '.',
      env: { NODE_PATH: nodePath },
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['profile-photo-compile'],
    },
    {
      id: 'refresh-flow',
      label: 'Refresh-token rotation flow',
      command: 'node',
      args: ['tests/test-refresh-flow.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 60_000,
      dependsOn: ['backend-build'],
    },
    {
      id: 'frontend-build',
      label: 'Frontend production build',
      command: 'yarn',
      args: ['run', 'build'],
      cwd: 'frontend',
      required: true,
      timeoutMs: 300_000,
      postconditions: [{ path: 'frontend/.next/standalone/server.js', type: 'file' }],
    },
    {
      id: 'i18n-http',
      label: 'i18n HTTP routing',
      command: 'node',
      args: ['tests/run-i18n-http.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 120_000,
      dependsOn: ['frontend-build'],
    },
    {
      id: 'security-audit',
      label: 'Security audit',
      command: 'node',
      args: ['tests/run-security-audit.mjs'],
      cwd: '.',
      required: true,
      timeoutMs: 180_000,
      dependsOn: ['backend-build'],
    },
    optionalCheck(
      {
        id: 'mongo-smoke',
        label: 'Legacy Mongo smoke',
        command: 'node',
        args: ['tests/run-mongo-smoke.mjs'],
        cwd: '.',
        required: false,
        timeoutMs: 180_000,
        dependsOn: ['backend-build'],
      },
      hasMongoMemoryServer,
      {
        reason: 'mongodb-memory-server is not installed; the legacy Mongo smoke cannot run',
        remediation: 'Install it with: cd backend && yarn add --dev mongodb-memory-server',
      },
    ),
    optionalCheck(
      {
        id: 'load-k6-auth',
        label: 'k6 auth load',
        command: 'node',
        args: ['tests/run-load-check.mjs', 'k6-auth', k6Path ?? ''],
        cwd: '.',
        required: false,
        timeoutMs: 180_000,
        dependsOn: ['backend-build'],
      },
      Boolean(k6Path),
      {
        reason: 'k6 is not installed; the auth load check was not executed',
        remediation: 'Install it on macOS with: brew install k6',
      },
    ),
    optionalCheck(
      {
        id: 'load-k6-oauth',
        label: 'k6 OAuth flow',
        command: 'node',
        args: ['tests/run-load-check.mjs', 'k6-oauth', k6Path ?? ''],
        cwd: '.',
        required: false,
        timeoutMs: 120_000,
        dependsOn: ['backend-build'],
      },
      Boolean(k6Path),
      {
        reason: 'k6 is not installed; the OAuth load check was not executed',
        remediation: 'Install it on macOS with: brew install k6',
      },
    ),
    optionalCheck(
      {
        id: 'load-autocannon',
        label: 'Autocannon benchmark',
        command: 'node',
        args: ['tests/run-load-check.mjs', 'autocannon'],
        cwd: '.',
        required: false,
        timeoutMs: 180_000,
        dependsOn: ['backend-build'],
      },
      hasAutocannon,
      {
        reason: 'autocannon is not installed; the throughput benchmark was not executed',
        remediation: 'Install it with: cd backend && yarn add --dev autocannon@7',
      },
    ),
  ];

  if (env.TEST_RUNNER_PROFILE === 'self') {
    return checks.filter(({ id }) => id === 'runner-tests');
  }
  if (env.TEST_RUNNER_PROFILE) {
    throw new Error(`Unsupported TEST_RUNNER_PROFILE: ${env.TEST_RUNNER_PROFILE}`);
  }
  return checks;
}

export async function main() {
  const controller = new AbortController();
  const interrupt = (signal) => {
    if (!controller.signal.aborted) controller.abort(signal);
  };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);

  try {
    const checks = await createProjectChecks(process.env);
    const { exitCode } = await runSuite(checks, {
      projectRoot,
      env: process.env,
      verbose: process.env.VERBOSE === '1',
      signal: controller.signal,
    });
    process.exitCode = exitCode;
  } catch (error) {
    console.error(`Test runner internal error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 2;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
