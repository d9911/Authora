import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { findFreePort } from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const backendRoot = path.join(projectRoot, 'backend');
const outputRoot = path.join(projectRoot, '.test-results/build/mongo-smoke');
const requireFromBackend = createRequire(path.join(backendRoot, 'package.json'));

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
  const typescript = requireFromBackend('typescript');
  const source = await readFile(path.join(backendRoot, 'smoke-test.ts'), 'utf8');
  const transpiled = typescript.transpileModule(source, {
    fileName: 'smoke-test.ts',
    reportDiagnostics: true,
    compilerOptions: {
      target: typescript.ScriptTarget.ES2022,
      module: typescript.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const diagnostics = (transpiled.diagnostics ?? []).filter(
    ({ category }) => category === typescript.DiagnosticCategory.Error,
  );
  if (diagnostics.length) {
    throw new Error(
      typescript.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => backendRoot,
        getNewLine: () => '\n',
      }),
    );
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, 'package.json'), '{"type":"commonjs"}\n', 'utf8');
  await writeFile(path.join(outputRoot, 'smoke-test.js'), transpiled.outputText, 'utf8');
  await symlink(path.join(backendRoot, 'dist'), path.join(outputRoot, 'src'), 'dir');

  const port = await findFreePort();
  await run(process.execPath, [path.join(outputRoot, 'smoke-test.js')], {
    cwd: outputRoot,
    env: {
      ...process.env,
      MONGO_SMOKE_PORT: String(port),
      NODE_PATH: path.join(backendRoot, 'node_modules'),
      NODE_ENV: 'test',
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
