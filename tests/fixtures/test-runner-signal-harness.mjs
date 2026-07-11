import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { runSuite } from '../test-runner-core.mjs';

const [projectRoot, pidPath, cleanupPath] = process.argv.slice(2);
const fixturePath = fileURLToPath(new URL('./test-runner-child.mjs', import.meta.url));
const controller = new AbortController();

const interrupt = (signal) => {
  if (!controller.signal.aborted) controller.abort(signal);
};

process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

const { exitCode } = await runSuite(
  [
    {
      id: 'signal-child',
      label: 'Signal child',
      command: process.execPath,
      args: [fixturePath, 'hang', pidPath, cleanupPath],
      cwd: '.',
      required: true,
      timeoutMs: 30_000,
    },
  ],
  {
    projectRoot,
    signal: controller.signal,
    env: process.env,
  },
);

process.exitCode = exitCode;
