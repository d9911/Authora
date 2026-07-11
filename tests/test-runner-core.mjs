import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout as wait } from 'node:timers/promises';

const ANSI = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

const SECRET_NAME = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASS|API_KEY|DATABASE_URL|MONGO_URI)(?:$|_)/i;
const CHECK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function elapsedMs(start, end) {
  return Math.max(0, Math.round(end - start));
}

export function formatDuration(durationMs) {
  return `${(durationMs / 1_000).toFixed(2)}s`;
}

export function shouldUseColor({ isTTY, noColor }) {
  return Boolean(isTTY && !noColor);
}

export function safeResultPath(projectRoot, ...segments) {
  const resultRoot = path.resolve(projectRoot, '.test-results');
  const candidate = path.resolve(resultRoot, ...segments);
  if (candidate !== resultRoot && !candidate.startsWith(`${resultRoot}${path.sep}`)) {
    throw new Error(`Result path is outside .test-results: ${candidate}`);
  }
  return candidate;
}

function resolveProjectPath(projectRoot, relativePath) {
  const root = path.resolve(projectRoot);
  const candidate = path.resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Check cwd is outside the project root: ${relativePath}`);
  }
  return candidate;
}

function executionSignature(check, projectRoot) {
  const cwd = resolveProjectPath(projectRoot, check.cwd);
  const env = Object.entries(check.env ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);
  return JSON.stringify([cwd, check.command, check.args, env]);
}

export function validateChecks(checks, projectRoot) {
  if (!Array.isArray(checks)) throw new TypeError('Checks must be an array');

  const ids = new Set();
  const signatures = new Map();
  const knownIds = new Set(checks.map((check) => check?.id));

  for (const [index, check] of checks.entries()) {
    if (!check || typeof check !== 'object') {
      throw new TypeError(`Check ${index + 1} must be an object`);
    }
    if (!CHECK_ID.test(check.id ?? '')) {
      throw new Error(`Invalid check id: ${check.id ?? '<missing>'}`);
    }
    if (ids.has(check.id)) throw new Error(`Duplicate check id: ${check.id}`);
    ids.add(check.id);
    if (typeof check.label !== 'string' || !check.label.trim()) {
      throw new Error(`Check ${check.id} must have a label`);
    }
    if (typeof check.command !== 'string' || !check.command) {
      throw new Error(`Check ${check.id} must have a command`);
    }
    if (!Array.isArray(check.args) || check.args.some((arg) => typeof arg !== 'string')) {
      throw new Error(`Check ${check.id} args must be an array of strings`);
    }
    if (typeof check.cwd !== 'string') {
      throw new Error(`Check ${check.id} must have a cwd`);
    }
    resolveProjectPath(projectRoot, check.cwd);
    if (check.timeoutMs !== undefined && (!Number.isFinite(check.timeoutMs) || check.timeoutMs <= 0)) {
      throw new Error(`Check ${check.id} timeoutMs must be positive`);
    }
    if (check.env !== undefined) {
      if (!check.env || typeof check.env !== 'object' || Array.isArray(check.env)) {
        throw new Error(`Check ${check.id} env must be an object`);
      }
      for (const [key, value] of Object.entries(check.env)) {
        if (typeof value !== 'string') throw new Error(`Check ${check.id} env ${key} must be a string`);
      }
    }
    if (check.skip && check.required !== false) {
      throw new Error(`Required check ${check.id} cannot use a WARN skip rule`);
    }
    for (const dependency of check.dependsOn ?? []) {
      if (!knownIds.has(dependency)) {
        throw new Error(`Check ${check.id} depends on unknown check ${dependency}`);
      }
      if (!ids.has(dependency)) {
        throw new Error(`Check ${check.id} dependency ${dependency} must appear first`);
      }
    }

    if (!check.skip) {
      const signature = executionSignature(check, projectRoot);
      const duplicate = signatures.get(signature);
      if (duplicate) {
        throw new Error(`Duplicate execution signature: ${duplicate} and ${check.id}`);
      }
      signatures.set(signature, check.id);
    }
  }
}

function colorize(enabled, color, text) {
  return enabled ? `${ANSI[color]}${text}${ANSI.reset}` : text;
}

function collectSecretValues(env) {
  return Object.entries(env)
    .filter(([key, value]) => SECRET_NAME.test(key) && typeof value === 'string' && value.length >= 4)
    .map(([, value]) => value)
    .sort((left, right) => right.length - left.length);
}

function redact(text, secrets) {
  let safe = text;
  for (const secret of secrets) safe = safe.split(secret).join('[REDACTED]');
  safe = safe.replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]');
  safe = safe.replace(
    /(["']?(?:password|token|secret|apiKey)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,
    '$1[REDACTED]',
  );
  return safe;
}

function createLineWriter({ logStream, liveStream, verbose, secrets, onOutput }) {
  let pending = '';

  const emit = (text) => {
    const safe = redact(text, secrets);
    logStream.write(safe);
    onOutput(safe);
    if (verbose) liveStream.write(safe);
  };

  return {
    push(chunk) {
      pending += chunk.toString();
      let newline = pending.indexOf('\n');
      while (newline !== -1) {
        emit(pending.slice(0, newline + 1));
        pending = pending.slice(newline + 1);
        newline = pending.indexOf('\n');
      }
    },
    flush() {
      if (pending) emit(pending);
      pending = '';
    },
  };
}

async function terminateProcessTree(child, graceMs) {
  if (!child?.pid) return;

  if (process.platform === 'win32') {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    await Promise.race([once(child, 'close').catch(() => {}), wait(graceMs)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    return;
  }

  const groupExists = () => {
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch (error) {
      if (error?.code === 'ESRCH') return false;
      if (error?.code === 'EPERM') return true;
      throw error;
    }
  };
  const send = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
  };
  const waitForGroupExit = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (groupExists() && Date.now() < deadline) await wait(25);
    return !groupExists();
  };

  if (!groupExists()) return;
  send('SIGTERM');
  if (await waitForGroupExit(graceMs)) return;
  send('SIGKILL');
  if (!(await waitForGroupExit(1_000))) {
    throw new Error(`Unable to terminate process group ${child.pid}`);
  }
}

function resultStatusLabel(status) {
  if (status === 'passed') return 'PASS';
  if (status === 'warning') return 'WARN';
  return 'FAIL';
}

function statusColor(status) {
  if (status === 'passed') return 'green';
  if (status === 'warning') return 'yellow';
  return 'red';
}

function progressLine(index, total, label, state, durationMs, color) {
  const prefix = `[${index}/${total}]`;
  const left = `${prefix} ${label}`.padEnd(50);
  const duration = durationMs === undefined ? '' : formatDuration(durationMs).padStart(8);
  return `${left}${color(state)}${duration ? `  ${duration}` : ''}\n`;
}

function meaningfulTail(output, lineCount) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .slice(-lineCount)
    .join('\n');
}

export function formatSummary(summary, { color = false } = {}) {
  const paint = (status, text) => colorize(color, statusColor(status), text);
  const maxLabel = Math.max(5, ...summary.results.map(({ label }) => label.length));
  const lines = [colorize(color, 'cyan', 'TEST RESULTS'), ''];
  lines.push(`#   ${'Check'.padEnd(maxLabel)}  Status   Duration`);
  summary.results.forEach((result, index) => {
    const status = resultStatusLabel(result.status).padEnd(6);
    lines.push(
      `${String(index + 1).padEnd(3)} ${result.label.padEnd(maxLabel)}  ${paint(result.status, status)}  ${formatDuration(result.durationMs).padStart(8)}`,
    );
  });
  lines.push('', 'Summary:');
  lines.push(colorize(color, 'green', `PASS: ${summary.totals.passed}`));
  lines.push(colorize(color, 'yellow', `WARN: ${summary.totals.warnings}`));
  lines.push(colorize(color, 'red', `FAIL: ${summary.totals.failed}`));
  lines.push(`TOTAL: ${summary.totals.total}`);
  lines.push(`TIME: ${formatDuration(summary.durationMs)}`, '');

  if (summary.totals.failed > 0 || summary.interruptedBy) {
    lines.push(colorize(color, 'red', 'TEST SUITE FAILED'));
  } else if (summary.totals.warnings > 0) {
    lines.push(colorize(color, 'yellow', 'TESTS PASSED WITH WARNINGS'));
  } else {
    lines.push(colorize(color, 'green', 'ALL REQUIRED TESTS PASSED'));
  }
  return `${lines.join('\n')}\n`;
}

async function checkPostconditions(check, projectRoot) {
  for (const postcondition of check.postconditions ?? []) {
    const target = resolveProjectPath(projectRoot, postcondition.path);
    try {
      const info = await stat(target);
      if (postcondition.type === 'file' && !info.isFile()) {
        return `Postcondition is not a file: ${postcondition.path}`;
      }
      if (postcondition.type === 'directory' && !info.isDirectory()) {
        return `Postcondition is not a directory: ${postcondition.path}`;
      }
    } catch (error) {
      if (error?.code === 'ENOENT') return `Postcondition is missing: ${postcondition.path}`;
      throw error;
    }
  }
  return null;
}

async function writeSyntheticLog(logPath, result) {
  const lines = [`${result.label}: ${resultStatusLabel(result.status)}`];
  if (result.reason) lines.push(`Reason: ${result.reason}`);
  if (result.remediation) lines.push(`Remediation: ${result.remediation}`);
  await writeFile(logPath, `${lines.join('\n')}\n`, 'utf8');
}

export async function runSuite(checks, options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  validateChecks(checks, projectRoot);

  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const env = options.env ?? process.env;
  const verbose = options.verbose ?? env.VERBOSE === '1';
  const colors = shouldUseColor({ isTTY: stdout.isTTY, noColor: Boolean(env.NO_COLOR) });
  const now = options.now ?? (() => performance.now());
  const wallNow = options.wallNow ?? (() => new Date());
  const terminateGraceMs = options.terminateGraceMs ?? 1_000;
  const tailLines = options.tailLines ?? 20;
  const signal = options.signal;
  const resultsRoot = safeResultPath(projectRoot);
  const logsRoot = safeResultPath(projectRoot, 'logs');
  const summaryPath = safeResultPath(projectRoot, 'summary.json');

  await rm(resultsRoot, { recursive: true, force: true });
  await mkdir(logsRoot, { recursive: true });

  const suiteStarted = now();
  const startedAt = wallNow().toISOString();
  const results = [];
  let interruptedBy = signal?.aborted ? String(signal.reason ?? 'SIGINT') : null;
  const width = Math.max(2, String(checks.length).length);

  stdout.write(`${colorize(colors, 'cyan', 'TEST SUITE')}\n\n`);

  for (const [offset, check] of checks.entries()) {
    if (signal?.aborted) {
      interruptedBy = String(signal.reason ?? interruptedBy ?? 'SIGINT');
      break;
    }

    const index = offset + 1;
    const relativeLogPath = path.posix.join(
      '.test-results',
      'logs',
      `${String(index).padStart(width, '0')}-${check.id}.log`,
    );
    const logPath = safeResultPath(projectRoot, 'logs', path.basename(relativeLogPath));
    const failedDependency = (check.dependsOn ?? []).find(
      (dependency) => results.find(({ id }) => id === dependency)?.status !== 'passed',
    );

    if (failedDependency || check.skip) {
      const warning = Boolean(check.skip);
      const result = {
        id: check.id,
        label: check.label,
        status: warning ? 'warning' : 'failed',
        required: check.required !== false,
        exitCode: null,
        signal: null,
        durationMs: 0,
        logPath: relativeLogPath,
        reason: check.skip
          ? check.skip.reason
          : `Dependency ${failedDependency} did not pass`,
        ...(check.skip?.remediation ? { remediation: check.skip.remediation } : {}),
      };
      await writeSyntheticLog(logPath, result);
      results.push(result);
      const label = resultStatusLabel(result.status);
      stdout.write(
        progressLine(index, checks.length, check.label, label, 0, (state) =>
          colorize(colors, statusColor(result.status), state),
        ),
      );
      stdout.write(`${colorize(colors, 'gray', `  ${result.reason}`)}\n`);
      if (result.remediation) stdout.write(`${colorize(colors, 'gray', `  ${result.remediation}`)}\n`);
      continue;
    }

    stdout.write(
      progressLine(index, checks.length, check.label, 'RUNNING', undefined, (state) =>
        colorize(colors, 'cyan', state),
      ),
    );

    const checkStarted = now();
    const childEnv = { ...env, ...(check.env ?? {}) };
    const secrets = collectSecretValues(childEnv);
    const logStream = createWriteStream(logPath, { flags: 'w', encoding: 'utf8' });
    let tailOutput = '';
    const rememberOutput = (text) => {
      tailOutput += text;
      if (tailOutput.length > 40_000) tailOutput = tailOutput.slice(-40_000);
    };

    let child;
    let spawnError = null;
    let timedOut = false;
    let aborted = false;
    let timeout;
    let abortHandler;
    let terminationPromise;
    let terminationError = null;

    const requestTermination = () => {
      terminationPromise ??= terminateProcessTree(child, terminateGraceMs);
      void terminationPromise.catch(() => {});
      return terminationPromise;
    };

    const completion = new Promise((resolve) => {
      child = spawn(check.command, check.args, {
        cwd: resolveProjectPath(projectRoot, check.cwd),
        env: childEnv,
        shell: false,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const stdoutWriter = createLineWriter({
        logStream,
        liveStream: stdout,
        verbose,
        secrets,
        onOutput: rememberOutput,
      });
      const stderrWriter = createLineWriter({
        logStream,
        liveStream: stderr,
        verbose,
        secrets,
        onOutput: rememberOutput,
      });
      child.stdout.on('data', (chunk) => stdoutWriter.push(chunk));
      child.stderr.on('data', (chunk) => stderrWriter.push(chunk));
      child.once('error', (error) => {
        spawnError = error;
        stderrWriter.push(`Unable to start command: ${error.message}\n`);
      });
      child.once('close', (exitCode, childSignal) => {
        stdoutWriter.flush();
        stderrWriter.flush();
        resolve({ exitCode, childSignal });
      });
    });

    if (check.timeoutMs) {
      timeout = setTimeout(() => {
        timedOut = true;
        void requestTermination();
      }, check.timeoutMs);
    }
    if (signal) {
      abortHandler = () => {
        if (aborted) return;
        aborted = true;
        interruptedBy = String(signal.reason ?? 'SIGINT');
        void requestTermination();
      };
      signal.addEventListener('abort', abortHandler, { once: true });
      if (signal.aborted) abortHandler();
    }

    const completed = await completion;
    if (timeout) clearTimeout(timeout);
    if (terminationPromise) {
      try {
        await terminationPromise;
      } catch (error) {
        terminationError = error;
      }
    }
    if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
    logStream.end();
    await once(logStream, 'finish');

    const postconditionFailure =
      !spawnError && !timedOut && !aborted && completed.exitCode === 0 && !completed.childSignal
        ? await checkPostconditions(check, projectRoot)
        : null;
    if (postconditionFailure) {
      const message = `${postconditionFailure}\n`;
      await writeFile(logPath, `${await readFile(logPath, 'utf8')}${message}`, 'utf8');
      rememberOutput(message);
    }

    const passed =
      !spawnError &&
      !timedOut &&
      !aborted &&
      !terminationError &&
      completed.exitCode === 0 &&
      !completed.childSignal &&
      !postconditionFailure;
    const durationMs = elapsedMs(checkStarted, now());
    const result = {
      id: check.id,
      label: check.label,
      status: passed ? 'passed' : 'failed',
      required: check.required !== false,
      exitCode: completed.exitCode,
      signal: completed.childSignal,
      durationMs,
      logPath: relativeLogPath,
      ...(timedOut ? { timedOut: true } : {}),
      ...(spawnError ? { reason: `Unable to start command: ${spawnError.message}` } : {}),
      ...(terminationError
        ? { reason: `Unable to clean up process tree: ${terminationError.message}` }
        : {}),
      ...(postconditionFailure ? { reason: postconditionFailure } : {}),
    };
    results.push(result);

    const state = resultStatusLabel(result.status);
    stdout.write(
      progressLine(index, checks.length, check.label, state, durationMs, (text) =>
        colorize(colors, statusColor(result.status), text),
      ),
    );

    if (!passed && !verbose) {
      const tail = meaningfulTail(tailOutput, tailLines);
      stdout.write(`\n${colorize(colors, 'red', `FAIL ${check.label}`)}\n\n`);
      if (tail) stdout.write(`Last output:\n${tail}\n\n`);
      stdout.write(`Full log:\n${relativeLogPath}\n\n`);
    }

    if (aborted) break;
  }

  if (signal?.aborted) interruptedBy = String(signal.reason ?? interruptedBy ?? 'SIGINT');

  const finishedAt = wallNow().toISOString();
  const totals = {
    passed: results.filter(({ status }) => status === 'passed').length,
    warnings: results.filter(({ status }) => status === 'warning').length,
    failed: results.filter(({ status }) => status === 'failed').length,
    total: results.length,
  };
  const summary = {
    startedAt,
    finishedAt,
    durationMs: elapsedMs(suiteStarted, now()),
    totals,
    plannedTotal: checks.length,
    ...(interruptedBy ? { interruptedBy } : {}),
    results,
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  stdout.write(`\n${formatSummary(summary, { color: colors })}`);

  return {
    exitCode: interruptedBy ? 130 : totals.failed > 0 ? 1 : 0,
    summary,
  };
}
