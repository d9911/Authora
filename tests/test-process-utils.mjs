import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import process from 'node:process';
import { setTimeout as wait } from 'node:timers/promises';

export function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to determine a free TCP port')));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

export function startCapturedProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    shell: false,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const appendOutput = (chunk) => {
    output += chunk.toString();
    const maxOutputChars = options.maxOutputChars ?? 40_000;
    if (output.length > maxOutputChars) output = output.slice(-maxOutputChars);
  };
  child.once('error', (error) => {
    appendOutput(`Unable to start ${command}: ${error.message}\n`);
  });
  child.stdout.on('data', (chunk) => {
    appendOutput(chunk);
  });
  child.stderr.on('data', (chunk) => {
    appendOutput(chunk);
  });
  return { child, output: () => output };
}

export function redactDiagnosticOutput(output) {
  return output
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED]')
    .replace(/(["']?(?:password|token|secret|apiKey|code)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi, '$1[REDACTED]')
    .replace(/\b\d{6}\b/g, '[REDACTED_OTP]');
}

export async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const intervalMs = options.intervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    if (options.child && (options.child.exitCode !== null || options.child.signalCode !== null)) {
      throw new Error(
        `Managed server exited before readiness${options.output?.().trim() ? `:\n${options.output().trim()}` : ''}`,
      );
    }
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(Math.min(2_000, Math.max(250, deadline - Date.now()))),
      });
      if ((options.accept ?? ((status) => status >= 200 && status < 500))(response.status)) return;
      lastError = new Error(`Unexpected readiness status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }

  const detail = options.output?.().trim();
  throw new Error(
    `Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : 'not ready'}` +
      (detail ? `\nManaged server output:\n${detail}` : ''),
  );
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      detached: false,
      stdio: options.stdio ?? 'inherit',
    });
    options.onChild?.(child);
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

export async function stopManagedProcess(child, graceMs = 1_000) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill('SIGTERM');
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
  }
  await Promise.race([once(child, 'close').catch(() => {}), wait(graceMs)]);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      child.kill('SIGKILL');
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
    }
    await once(child, 'close').catch(() => {});
  }
}
