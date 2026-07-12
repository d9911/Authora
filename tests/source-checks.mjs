const SOURCE_CHECK_TIMEOUT_MS = 60_000;

const defineSourceCheck = (id, label, file) => ({
  id,
  label,
  command: 'node',
  args: [file],
  cwd: '.',
  required: true,
  timeoutMs: SOURCE_CHECK_TIMEOUT_MS,
});

export const sourceChecks = [
  defineSourceCheck(
    'i18n-config-and-routing',
    'i18n config and routing',
    'tests/i18n-config-and-routing.mjs',
  ),
  defineSourceCheck(
    'i18n-locale-routing-contract',
    'i18n locale routing contract',
    'tests/i18n-locale-routing-contract.mjs',
  ),
  defineSourceCheck(
    'i18n-locales-parity',
    'i18n locale key parity',
    'tests/i18n-locales-parity.mjs',
  ),
  defineSourceCheck(
    'i18n-used-keys',
    'i18n used translation keys',
    'tests/i18n-used-keys.mjs',
  ),
  defineSourceCheck(
    'i18n-source-coverage',
    'i18n source coverage',
    'tests/i18n-source-coverage.mjs',
  ),
  defineSourceCheck(
    'i18n-production-fallback',
    'i18n production fallback',
    'tests/i18n-production-fallback.mjs',
  ),
  defineSourceCheck(
    'i18n-metadata',
    'i18n metadata',
    'tests/i18n-metadata.mjs',
  ),
  defineSourceCheck(
    'i18n-auth-integration',
    'i18n auth integration',
    'tests/i18n-auth-integration.mjs',
  ),
  defineSourceCheck(
    'i18n-mobile-header',
    'i18n mobile header',
    'tests/i18n-mobile-header.mjs',
  ),
  defineSourceCheck(
    'auth-flow-and-registration',
    'Auth flow and registration',
    'tests/auth-flow-and-registration.mjs',
  ),
  defineSourceCheck(
    'backend-clean-architecture-boundaries',
    'Backend clean architecture boundaries',
    'tests/backend-clean-architecture-boundaries.mjs',
  ),
  defineSourceCheck(
    'frontend-fsd-boundaries',
    'Frontend FSD boundaries',
    'tests/frontend-fsd-boundaries.mjs',
  ),
  defineSourceCheck(
    'auth-auto-code-and-redirect',
    'Auth auto-code and redirect',
    'tests/auth-auto-code-and-redirect.mjs',
  ),
  defineSourceCheck(
    'auth-email-and-signin-ux',
    'Auth email and sign-in UX',
    'tests/auth-email-and-signin-ux.mjs',
  ),
  defineSourceCheck(
    'frontend-connected-accounts-email',
    'Connected accounts email',
    'tests/frontend-connected-accounts-email.mjs',
  ),
  defineSourceCheck(
    'docker-compose-env-files',
    'Docker Compose environment files',
    'tests/docker-compose-env-files.mjs',
  ),
  defineSourceCheck(
    'telegram-bot-config-guard',
    'Telegram bot config guard',
    'tests/telegram-bot-config-guard.mjs',
  ),
  defineSourceCheck(
    'theme-hydration',
    'Theme hydration',
    'tests/theme-hydration.mjs',
  ),
  defineSourceCheck(
    'sass-deprecation-warnings',
    'Sass deprecation warnings',
    'tests/sass-deprecation-warnings.mjs',
  ),
  defineSourceCheck(
    'oauth-cookie-handoff-fields',
    'OAuth cookie handoff fields',
    'tests/oauth-cookie-handoff-fields.mjs',
  ),
  defineSourceCheck(
    'account-recovery-contract',
    'Account recovery contract',
    'tests/account-recovery-contract.mjs',
  ),
  defineSourceCheck(
    'account-recovery-session-version',
    'Account recovery session version',
    'tests/account-recovery-session-version.mjs',
  ),
  defineSourceCheck(
    'account-recovery-settings',
    'Account recovery settings',
    'tests/account-recovery-settings.mjs',
  ),
  defineSourceCheck(
    'account-recovery-security',
    'Account recovery security',
    'tests/account-recovery-security.mjs',
  ),
  defineSourceCheck(
    'account-recovery-observability',
    'Account recovery observability',
    'tests/account-recovery-observability.mjs',
  ),
  defineSourceCheck(
    'account-recovery-persistence',
    'Account recovery persistence',
    'tests/account-recovery-persistence.mjs',
  ),
  defineSourceCheck(
    'two-factor-recovery-codes',
    'Two-factor recovery codes',
    'tests/two-factor-recovery-codes.mjs',
  ),
  defineSourceCheck(
    'auth-hydration-request-loop',
    'Auth hydration request loop',
    'tests/auth-hydration-request-loop.mjs',
  ),
  defineSourceCheck(
    'auth-session-skeleton',
    'Auth session skeleton',
    'tests/auth-session-skeleton.mjs',
  ),
  defineSourceCheck(
    'graphql-client-refresh',
    'GraphQL client refresh concurrency',
    'tests/graphql-client-refresh.test.mjs',
  ),
];
