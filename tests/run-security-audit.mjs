import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { findFreePort, runCommand } from './test-process-utils.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const port = await findFreePort();
const result = await runCommand(process.execPath, ['tests/security/audit.mjs'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    SECURITY_AUDIT_PORT: String(port),
    SECURITY_AUDIT_SKIP_BUILD: '1',
  },
});

if (result.signal) {
  console.error(`Security audit was terminated by ${result.signal}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.exitCode ?? 1;
}
