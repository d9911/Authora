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
let activeChild;
let interruptedBy;

const throwIfInterrupted = () => {
  if (interruptedBy) throw new Error(`Interrupted by ${interruptedBy}`);
};

const interrupt = (signal) => {
  interruptedBy ??= signal;
  activeChild?.kill('SIGTERM');
  server?.child.kill('SIGTERM');
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

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = startCapturedProcess(process.execPath, ['server.js'], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      PORT: String(port),
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
    env: { ...process.env, I18N_BASE_URL: baseUrl, NODE_ENV: 'production' },
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
  }
  process.exitCode = interruptedBy ? 130 : 1;
} finally {
  await stopManagedProcess(server?.child);
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
