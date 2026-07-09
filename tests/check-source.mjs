import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['tests/backend-clean-architecture-boundaries.mjs']],
  ['node', ['tests/frontend-fsd-boundaries.mjs']],
  ['node', ['tests/auth-auto-code-and-redirect.mjs']],
  ['node', ['tests/auth-email-and-signin-ux.mjs']],
  ['node', ['tests/frontend-connected-accounts-email.mjs']],
  ['node', ['tests/docker-compose-env-files.mjs']],
  ['node', ['tests/telegram-bot-config-guard.mjs']],
  ['node', ['tests/theme-hydration.mjs']],
  ['node', ['tests/sass-deprecation-warnings.mjs']],
  ['node', ['tests/oauth-cookie-handoff-fields.mjs']],
];

for (const [cmd, args] of commands) {
  const label = [cmd, ...args].join(' ');
  console.log(`\n> ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\ncheck-source failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\ncheck-source passed');
