import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['tests/i18n-config-and-routing.mjs']],
  ['node', ['tests/i18n-locale-routing-contract.mjs']],
  ['node', ['tests/i18n-locales-parity.mjs']],
  ['node', ['tests/i18n-used-keys.mjs']],
  ['node', ['tests/i18n-source-coverage.mjs']],
  ['node', ['tests/i18n-production-fallback.mjs']],
  ['node', ['tests/i18n-metadata.mjs']],
  ['node', ['tests/i18n-auth-integration.mjs']],
  ['node', ['tests/i18n-mobile-header.mjs']],
  ['node', ['tests/auth-flow-and-registration.mjs']],
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
  ['node', ['tests/account-recovery-contract.mjs']],
  ['node', ['tests/account-recovery-session-version.mjs']],
  ['node', ['tests/account-recovery-settings.mjs']],
  ['node', ['tests/account-recovery-security.mjs']],
  ['node', ['tests/account-recovery-observability.mjs']],
  ['node', ['tests/account-recovery-persistence.mjs']],
  ['node', ['tests/two-factor-recovery-codes.mjs']],
  ['node', ['tests/auth-hydration-request-loop.mjs']],
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
