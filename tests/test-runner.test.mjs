import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  elapsedMs,
  formatDuration,
  runSuite,
  safeResultPath,
  shouldUseColor,
  validateChecks,
} from './test-runner-core.mjs';
import { createProjectChecks } from './test-runner.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/test-runner-child.mjs', import.meta.url));
const signalHarnessPath = fileURLToPath(
  new URL('./fixtures/test-runner-signal-harness.mjs', import.meta.url),
);

async function makeProject(t) {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'authora-runner-'));
  t.after(() => rm(projectRoot, { recursive: true, force: true }));
  return projectRoot;
}

function makeCheck(id, fixtureArgs, overrides = {}) {
  return {
    id,
    label: overrides.label ?? id,
    command: process.execPath,
    args: [fixturePath, ...fixtureArgs],
    cwd: '.',
    required: true,
    timeoutMs: 5_000,
    ...overrides,
  };
}

function captureStream(isTTY = false) {
  const stream = new PassThrough();
  stream.isTTY = isTTY;
  let output = '';
  stream.on('data', (chunk) => {
    output += chunk.toString();
  });
  return { stream, output: () => output };
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function waitForFile(filePath, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pathExists(filePath)) return;
    await wait(25);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

test('runs checks strictly sequentially', async (t) => {
  const projectRoot = await makeProject(t);
  const orderPath = path.join(projectRoot, 'order.log');
  const { summary } = await runSuite(
    [
      makeCheck('first', ['record', 'first', orderPath, '80']),
      makeCheck('second', ['record', 'second', orderPath, '0']),
    ],
    { projectRoot },
  );

  assert.equal(await readFile(orderPath, 'utf8'), 'start:first\nend:first\nstart:second\nend:second\n');
  assert.deepEqual(summary.results.map(({ status }) => status), ['passed', 'passed']);
});

test('maps exit code zero to PASS and non-zero to FAIL', async (t) => {
  const projectRoot = await makeProject(t);
  const { exitCode, summary } = await runSuite(
    [makeCheck('pass', ['pass']), makeCheck('fail', ['fail', '7'])],
    { projectRoot },
  );

  assert.equal(exitCode, 1);
  assert.equal(summary.results[0].status, 'passed');
  assert.equal(summary.results[0].exitCode, 0);
  assert.equal(summary.results[1].status, 'failed');
  assert.equal(summary.results[1].exitCode, 7);
});

test('treats an unavailable required command as FAIL', async (t) => {
  const projectRoot = await makeProject(t);
  const missing = makeCheck('missing-command', ['pass'], {
    command: path.join(projectRoot, 'definitely-not-a-command'),
  });
  const { exitCode, summary } = await runSuite([missing], { projectRoot });
  assert.equal(exitCode, 1);
  assert.equal(summary.results[0].status, 'failed');
  assert.match(summary.results[0].reason, /unable to start command/i);
  const log = await readFile(path.join(projectRoot, summary.results[0].logPath), 'utf8');
  assert.match(log, /unable to start command/i);
});

test('continues after a failed check', async (t) => {
  const projectRoot = await makeProject(t);
  const orderPath = path.join(projectRoot, 'continued.log');
  const { summary } = await runSuite(
    [
      makeCheck('before', ['record', 'before', orderPath, '0']),
      makeCheck('failure', ['fail', '3']),
      makeCheck('after', ['record', 'after', orderPath, '0']),
    ],
    { projectRoot },
  );

  assert.match(await readFile(orderPath, 'utf8'), /start:after\nend:after/);
  assert.equal(summary.results.length, 3);
});

test('creates WARN only from an explicit skip rule', async (t) => {
  const projectRoot = await makeProject(t);
  const skipped = makeCheck('optional-tool', ['fail', '9'], {
    required: false,
    skip: {
      reason: 'optional tool is not installed',
      remediation: 'install optional-tool',
    },
  });
  const { exitCode, summary } = await runSuite(
    [skipped, makeCheck('ordinary-words', ['words'])],
    { projectRoot },
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(summary.results.map(({ status }) => status), ['warning', 'passed']);
  assert.deepEqual(summary.totals, { passed: 1, warnings: 1, failed: 0, total: 2 });
});

test('keeps an explicit optional skip as WARN when its dependency failed', async (t) => {
  const projectRoot = await makeProject(t);
  const { exitCode, summary } = await runSuite(
    [
      makeCheck('build', ['fail', '1']),
      makeCheck('optional-after-build', ['pass'], {
        required: false,
        dependsOn: ['build'],
        skip: { reason: 'optional tool is absent', remediation: 'install it' },
      }),
    ],
    { projectRoot },
  );

  assert.equal(exitCode, 1);
  assert.deepEqual(summary.results.map(({ status }) => status), ['failed', 'warning']);
  assert.equal(summary.totals.warnings, 1);
});

test('does not miss an abort that races with listener registration', async (t) => {
  const projectRoot = await makeProject(t);
  let aborted = false;
  const racingSignal = {
    reason: 'SIGINT',
    get aborted() {
      return aborted;
    },
    addEventListener() {
      aborted = true;
    },
    removeEventListener() {},
  };
  const { exitCode, summary } = await runSuite(
    [makeCheck('racing-abort', ['pass'])],
    { projectRoot, signal: racingSignal },
  );

  assert.equal(exitCode, 130);
  assert.equal(summary.interruptedBy, 'SIGINT');
  assert.equal(summary.results[0].status, 'failed');
});

test('does not miss an abort after the last child closes', async (t) => {
  const projectRoot = await makeProject(t);
  let aborted = false;
  const finalWindowSignal = {
    reason: 'SIGINT',
    get aborted() {
      return aborted;
    },
    addEventListener() {},
    removeEventListener() {
      aborted = true;
    },
  };
  const { exitCode, summary } = await runSuite(
    [makeCheck('final-window', ['pass'])],
    { projectRoot, signal: finalWindowSignal },
  );

  assert.equal(exitCode, 130);
  assert.equal(summary.interruptedBy, 'SIGINT');
});

test('calculates counters and durations', async (t) => {
  assert.equal(elapsedMs(100, 350), 250);
  assert.equal(formatDuration(1_240), '1.24s');

  const projectRoot = await makeProject(t);
  const { summary } = await runSuite(
    [
      makeCheck('pass', ['pass']),
      makeCheck('warn', ['pass'], {
        required: false,
        skip: { reason: 'fixture skip', remediation: 'none' },
      }),
      makeCheck('fail', ['fail', '1']),
    ],
    { projectRoot },
  );

  assert.deepEqual(summary.totals, { passed: 1, warnings: 1, failed: 1, total: 3 });
  assert.ok(summary.durationMs >= 0);
  assert.ok(summary.results.every(({ durationMs }) => durationMs >= 0));
  assert.ok(Date.parse(summary.finishedAt) >= Date.parse(summary.startedAt));
});

test('disables ANSI with NO_COLOR even for TTY output', async (t) => {
  const projectRoot = await makeProject(t);
  const output = captureStream(true);
  await runSuite([makeCheck('pass', ['pass'])], {
    projectRoot,
    stdout: output.stream,
    env: { ...process.env, NO_COLOR: '1' },
  });

  assert.equal(shouldUseColor({ isTTY: true, noColor: true }), false);
  assert.doesNotMatch(output.output(), /\x1b\[/);
});

test('disables ANSI for non-TTY output and enables it for TTY', async (t) => {
  const projectRoot = await makeProject(t);
  const plain = captureStream(false);
  await runSuite([makeCheck('plain', ['pass'])], {
    projectRoot,
    stdout: plain.stream,
    env: { ...process.env, NO_COLOR: '' },
  });
  assert.doesNotMatch(plain.output(), /\x1b\[/);

  const ttyRoot = await makeProject(t);
  const colored = captureStream(true);
  await runSuite([makeCheck('colored', ['pass'])], {
    projectRoot: ttyRoot,
    stdout: colored.stream,
    env: { ...process.env, NO_COLOR: '' },
  });
  assert.equal(shouldUseColor({ isTTY: true, noColor: false }), true);
  assert.match(colored.output(), /\x1b\[32m/);
});

test('writes a valid summary JSON with contained relative log paths', async (t) => {
  const projectRoot = await makeProject(t);
  const { summary } = await runSuite([makeCheck('json-check', ['pass'])], { projectRoot });
  const summaryPath = path.join(projectRoot, '.test-results', 'summary.json');
  const fromDisk = JSON.parse(await readFile(summaryPath, 'utf8'));

  assert.deepEqual(fromDisk, summary);
  assert.equal(fromDisk.results[0].logPath, '.test-results/logs/01-json-check.log');
  assert.equal(fromDisk.totals.total, 1);
});

test('returns 1 for FAIL and 0 for PASS plus WARN', async (t) => {
  const failingRoot = await makeProject(t);
  const failed = await runSuite([makeCheck('required-fail', ['fail', '2'])], {
    projectRoot: failingRoot,
  });
  assert.equal(failed.exitCode, 1);

  const warningRoot = await makeProject(t);
  const allowed = await runSuite(
    [
      makeCheck('pass', ['pass']),
      makeCheck('warn', ['pass'], {
        required: false,
        skip: { reason: 'optional dependency missing', remediation: 'install it' },
      }),
    ],
    { projectRoot: warningRoot },
  );
  assert.equal(allowed.exitCode, 0);
});

test('SIGINT terminates the current child, writes partial summary, and exits 130', async (t) => {
  const projectRoot = await makeProject(t);
  const pidPath = path.join(projectRoot, 'child.pid');
  const cleanupPath = path.join(projectRoot, 'cleanup.log');
  const harness = spawn(process.execPath, [signalHarnessPath, projectRoot, pidPath, cleanupPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let harnessOutput = '';
  harness.stdout.on('data', (chunk) => {
    harnessOutput += chunk.toString();
  });
  harness.stderr.on('data', (chunk) => {
    harnessOutput += chunk.toString();
  });
  t.after(() => {
    if (harness.exitCode === null) harness.kill('SIGKILL');
  });

  await waitForFile(pidPath);
  const childPid = Number(await readFile(pidPath, 'utf8'));
  harness.kill('SIGINT');
  const harnessExit = await new Promise((resolve) => harness.once('close', resolve));

  assert.equal(harnessExit, 130, harnessOutput);
  await waitForFile(cleanupPath);
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      process.kill(childPid, 0);
      await wait(25);
    } catch (error) {
      if (error?.code === 'ESRCH') break;
      throw error;
    }
  }
  assert.throws(() => process.kill(childPid, 0), { code: 'ESRCH' });

  const partial = JSON.parse(
    await readFile(path.join(projectRoot, '.test-results', 'summary.json'), 'utf8'),
  );
  assert.equal(partial.interruptedBy, 'SIGINT');
  assert.equal(partial.results[0].status, 'failed');
});

test('rejects duplicate ids and execution signatures before launching children', async (t) => {
  const projectRoot = await makeProject(t);
  const marker = path.join(projectRoot, 'marker.log');
  const first = makeCheck('first', ['record', 'first', marker, '0']);
  const duplicateId = { ...makeCheck('first', ['pass']), label: 'duplicate id' };
  assert.throws(() => validateChecks([first, duplicateId], projectRoot), /duplicate check id/i);

  const duplicateSignature = { ...first, id: 'second', label: 'duplicate command' };
  await assert.rejects(
    () => runSuite([first, duplicateSignature], { projectRoot }),
    /duplicate execution signature/i,
  );
  assert.equal(await pathExists(marker), false);
});

test('production catalog contains 54 unique validated leaf steps', async () => {
  const checks = await createProjectChecks({ ...process.env, TEST_RUNNER_PROFILE: '' });
  validateChecks(checks, path.resolve(fileURLToPath(new URL('../', import.meta.url))));
  assert.equal(checks.length, 54);
  assert.equal(new Set(checks.map(({ id }) => id)).size, 54);
  assert.equal(checks[0].id, 'runner-tests');
  assert.equal(checks.filter(({ required }) => required === false).length, 4);
});

test('prevents result paths from escaping .test-results', async (t) => {
  const projectRoot = await makeProject(t);
  const safe = safeResultPath(projectRoot, 'logs', 'safe.log');
  assert.equal(safe, path.join(projectRoot, '.test-results', 'logs', 'safe.log'));
  assert.throws(() => safeResultPath(projectRoot, '..', 'outside.log'), /outside \.test-results/i);
  assert.throws(
    () => validateChecks([makeCheck('../../outside', ['pass'])], projectRoot),
    /invalid check id/i,
  );
});

test('treats timeout and child signal as FAIL and continues', async (t) => {
  const projectRoot = await makeProject(t);
  const pidPath = path.join(projectRoot, 'timeout.pid');
  const cleanupPath = path.join(projectRoot, 'timeout-cleanup.log');
  const { exitCode, summary } = await runSuite(
    [
      makeCheck('timeout', ['hang', pidPath, cleanupPath], { timeoutMs: 100 }),
      makeCheck('signal', ['signal-self']),
      makeCheck('after', ['pass']),
    ],
    { projectRoot, terminateGraceMs: 500 },
  );

  assert.equal(exitCode, 1);
  assert.deepEqual(summary.results.map(({ status }) => status), ['failed', 'failed', 'passed']);
  assert.equal(summary.results[0].timedOut, true);
  assert.equal(summary.results[1].signal, 'SIGTERM');
  await waitForFile(cleanupPath);
});

test('kills a SIGTERM-ignoring grandchild before continuing', async (t) => {
  const projectRoot = await makeProject(t);
  const grandchildPidPath = path.join(projectRoot, 'grandchild.pid');
  let grandchildPid;
  t.after(() => {
    if (!grandchildPid) return;
    try {
      process.kill(grandchildPid, 'SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  });

  const { summary } = await runSuite(
    [
      makeCheck('grandchild-timeout', ['spawn-grandchild', grandchildPidPath], {
        timeoutMs: 150,
      }),
      makeCheck('after-grandchild', ['pass']),
    ],
    { projectRoot, terminateGraceMs: 200 },
  );
  await waitForFile(grandchildPidPath);
  grandchildPid = Number(await readFile(grandchildPidPath, 'utf8'));

  assert.deepEqual(summary.results.map(({ status }) => status), ['failed', 'passed']);
  assert.throws(() => process.kill(grandchildPid, 0), { code: 'ESRCH' });
});

test('all managed backend helpers use the loopback-only test launcher', async () => {
  const projectRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  const launcher = await readFile(path.join(projectRoot, 'tests/start-test-backend.mjs'), 'utf8');
  assert.match(launcher, /const HOST = '127\.0\.0\.1'/);
  assert.match(launcher, /app\.listen\(port, HOST/);
  for (const relativePath of [
    'tests/run-load-check.mjs',
    'tests/test-refresh-flow.mjs',
    'tests/security/audit.mjs',
    'tests/run-tests.sh',
  ]) {
    const source = await readFile(path.join(projectRoot, relativePath), 'utf8');
    assert.match(source, /start-test-backend\.mjs/, relativePath);
    assert.doesNotMatch(source, /dist\/app\/server\.js/, relativePath);
  }
});

test('redacts known secret environment values from logs', async (t) => {
  const projectRoot = await makeProject(t);
  const secret = 'runner-secret-value-123';
  const { summary } = await runSuite(
    [
      makeCheck('secret', ['secret'], {
        env: { FIXTURE_SECRET: secret },
      }),
    ],
    { projectRoot },
  );
  const log = await readFile(path.join(projectRoot, summary.results[0].logPath), 'utf8');
  assert.doesNotMatch(log, new RegExp(secret));
  assert.match(log, /\[REDACTED\]/);
});
