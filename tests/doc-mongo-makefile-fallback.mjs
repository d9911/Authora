import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const tempDir = await mkdtemp(join(tmpdir(), 'authora-doc-mongo-'));
const logPath = join(tempDir, 'docker.log');
const fakeDockerPath = join(tempDir, 'docker');
const fakeYarnPath = join(tempDir, 'yarn');

await writeFile(
  fakeDockerPath,
  `#!/bin/sh
printf '%s\\n' "$*" >> "${logPath}"

if [ "$1" = "compose" ]; then
  case "$*" in
    *" build "*)
    case "$*" in
      *"--pull=false"*"backend frontend"*)
        exit 0
        ;;
      *)
        echo "compose build must use --pull=false for backend frontend" >&2
        exit 64
        ;;
    esac
      ;;
  esac

  case "$*" in
    *" up "*"--build"*)
      echo "up --build would risk Docker Hub metadata resolution and stale fallback behavior" >&2
      exit 1
      ;;
    *)
      exit 0
      ;;
  esac
fi

if [ "$1" = "image" ] && [ "$2" = "inspect" ]; then
  exit 0
fi

echo "unexpected docker args: $*" >&2
exit 64
`,
);
await chmod(fakeDockerPath, 0o755);

await writeFile(
  fakeYarnPath,
  `#!/bin/sh
printf '%s\\n' "yarn $*" >> "${logPath}"
exit 0
`,
);
await chmod(fakeYarnPath, 0o755);

const result = await new Promise((resolve) => {
  const child = spawn('make', ['doc-mongo'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PATH: `${tempDir}:${process.env.PATH ?? ''}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.on('close', (code) => resolve({ code, stdout, stderr }));
});

const dockerLog = await readFile(logPath, 'utf8');

assert.equal(
  result.code,
  0,
  `make doc-mongo should build local images without using compose up --build.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}\nDOCKER LOG:\n${dockerLog}`,
);
assert.match(dockerLog, /image inspect authora-backend:latest/);
assert.match(dockerLog, /image inspect authora-frontend:latest/);
assert.match(dockerLog, /compose .* build --pull=false backend frontend/);
assert.doesNotMatch(dockerLog, / up .*--build/);
assert.doesNotMatch(result.stdout, /Docker Hub metadata/);

const dockerCalls = dockerLog.trim().split('\n').filter((line) => !line.startsWith('yarn '));
assert.match(dockerCalls.at(-1) ?? '', /compose .* up -d --no-build --force-recreate backend frontend/);
