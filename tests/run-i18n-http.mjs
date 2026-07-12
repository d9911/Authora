import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  findFreePort,
  redactDiagnosticOutput,
  runCommand,
  startCapturedProcess,
  stopManagedProcess,
  waitForHttp,
} from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const frontendRoot = path.join(projectRoot, 'frontend');
const runtimeRoot = path.join(projectRoot, '.test-results', 'runtime', 'frontend');
let server;
let backend;
let activeChild;
let interruptedBy;

const throwIfInterrupted = () => {
  if (interruptedBy) throw new Error(`Interrupted by ${interruptedBy}`);
};

const interrupt = (signal) => {
  interruptedBy ??= signal;
  activeChild?.kill('SIGTERM');
  server?.child.kill('SIGTERM');
  backend?.child.kill('SIGTERM');
};

process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

try {
  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(path.dirname(runtimeRoot), { recursive: true });
  await cp(path.join(frontendRoot, '.next', 'standalone'), runtimeRoot, { recursive: true });
  const runtimeRootEntries = await readdir(runtimeRoot);
  await Promise.all(
    runtimeRootEntries
      .filter((name) => name === '.env' || name.startsWith('.env.'))
      .map((name) => rm(path.join(runtimeRoot, name), { force: true })),
  );
  await cp(path.join(frontendRoot, 'public'), path.join(runtimeRoot, 'public'), { recursive: true });
  await mkdir(path.join(runtimeRoot, '.next'), { recursive: true });
  await cp(path.join(frontendRoot, '.next', 'static'), path.join(runtimeRoot, '.next', 'static'), {
    recursive: true,
  });
  throwIfInterrupted();

  const backendPort = await findFreePort();
  const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
  backend = startCapturedProcess(process.execPath, ['tests/start-test-backend.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BACKEND_PORT: String(backendPort),
      DB_TYPE: 'sqlite',
      SQLITE_FILE: ':memory:',
      JWT_ACCESS_SECRET: 'proxy_session_test_access',
      JWT_REFRESH_SECRET: 'proxy_session_test_refresh',
      SMTP_USER: '',
      SMTP_PASS: '',
      AUTH_RATE_LIMIT_MAX: '100',
      AUTH_IDENTIFIER_RATE_LIMIT_MAX: '100',
    },
  });
  await waitForHttp(`${backendBaseUrl}/health`, {
    child: backend.child,
    output: backend.output,
    timeoutMs: 15_000,
    accept: (status) => status === 200,
  });
  throwIfInterrupted();

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = startCapturedProcess(process.execPath, ['server.js'], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
      BACKEND_INTERNAL_URL: backendBaseUrl,
    },
  });
  await waitForHttp(`${baseUrl}/ru/sign-in`, {
    child: server.child,
    output: server.output,
    timeoutMs: 30_000,
    accept: (status) => status === 200,
  });
  throwIfInterrupted();

  const result = await runCommand(process.execPath, ['tests/i18n-http-routing.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      I18N_BASE_URL: baseUrl,
      AUTH_TEST_BACKEND_URL: backendBaseUrl,
      NODE_ENV: 'production',
    },
    onChild: (child) => {
      activeChild = child;
    },
  });
  activeChild = undefined;
  if (result.signal) throw new Error(`i18n HTTP checks were terminated by ${result.signal}`);
  if (result.exitCode !== 0) throw new Error(`i18n HTTP checks exited with ${result.exitCode}`);
} catch (error) {
  if (!interruptedBy) {
    console.error(error instanceof Error ? error.message : error);
    const serverOutput = server?.output().trim();
    if (serverOutput) console.error(redactDiagnosticOutput(serverOutput));
    const backendOutput = backend?.output().trim();
    if (backendOutput) console.error(redactDiagnosticOutput(backendOutput));
  }
  process.exitCode = interruptedBy ? 130 : 1;
} finally {
  await stopManagedProcess(server?.child);
  await stopManagedProcess(backend?.child);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
