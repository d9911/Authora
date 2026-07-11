import { spawnSync } from 'node:child_process';
import { sourceChecks } from './source-checks.mjs';

for (const { command, args, cwd } of sourceChecks) {
  const label = [command, ...args].join(' ');
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\ncheck-source failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\ncheck-source passed');
