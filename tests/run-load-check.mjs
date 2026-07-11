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
const backendRoot = path.join(projectRoot, 'backend');
const [kind, toolPath] = process.argv.slice(2);
const supportedKinds = new Set(['k6-auth', 'k6-oauth', 'autocannon']);

if (!supportedKinds.has(kind)) {
  console.error(`Unsupported load check: ${kind ?? '<missing>'}`);
  process.exit(64);
}
if (kind.startsWith('k6-') && !path.isAbsolute(toolPath ?? '')) {
  console.error('A resolved absolute k6 executable path is required');
  process.exit(64);
}

let backend;
let activeChild;
let interruptedBy;

const interrupt = (signal) => {
  interruptedBy ??= signal;
  activeChild?.kill('SIGTERM');
  backend?.child.kill('SIGTERM');
};

process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

try {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  backend = startCapturedProcess(process.execPath, ['tests/start-test-backend.mjs'], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      BACKEND_PORT: String(port),
      DB_TYPE: 'sqlite',
      SQLITE_FILE: ':memory:',
      JWT_ACCESS_SECRET: 'load_access_secret',
      JWT_REFRESH_SECRET: 'load_refresh_secret',
      SMTP_USER: '',
      SMTP_PASS: '',
      RATE_LIMIT_MAX: '100000',
      AUTH_RATE_LIMIT_MAX: '100000',
      AUTH_IDENTIFIER_RATE_LIMIT_MAX: '100000',
    },
  });
  await waitForHttp(`${baseUrl}/health`, {
    child: backend.child,
    output: backend.output,
    timeoutMs: 30_000,
    accept: (status) => status === 200,
  });

  const command = kind.startsWith('k6-') ? toolPath : process.execPath;
  const args =
    kind === 'k6-auth'
      ? ['run', path.join(projectRoot, 'tests/load/k6-auth.js')]
      : kind === 'k6-oauth'
        ? ['run', path.join(projectRoot, 'tests/load/k6-oauth.js')]
        : [path.join(projectRoot, 'tests/load/autocannon-bench.mjs')];
  const result = await runCommand(command, args, {
    cwd: kind === 'autocannon' ? backendRoot : projectRoot,
    env: {
      ...process.env,
      BASE_URL: baseUrl,
    },
    onChild: (child) => {
      activeChild = child;
    },
  });
  activeChild = undefined;
  if (result.signal) throw new Error(`${kind} was terminated by ${result.signal}`);
  if (result.exitCode !== 0) throw new Error(`${kind} exited with ${result.exitCode}`);
} catch (error) {
  if (!interruptedBy) {
    console.error(error instanceof Error ? error.message : error);
    const backendOutput = backend?.output().trim();
    if (backendOutput) console.error(redactDiagnosticOutput(backendOutput));
  }
  process.exitCode = interruptedBy ? 130 : 1;
} finally {
  await stopManagedProcess(backend?.child);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
