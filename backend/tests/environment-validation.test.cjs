const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const backendRoot = resolve(__dirname, '..');
const validationScript = [
  "const { validateRecoveryEnvironment } = require('./dist/config/env.js');",
  'validateRecoveryEnvironment();',
].join(' ');

function validate(frontendUrl, allowInsecurePublicHttp = '') {
  return spawnSync(process.execPath, ['-e', validationScript], {
    cwd: backendRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      FRONTEND_URL: frontendUrl,
      ALLOW_INSECURE_PUBLIC_HTTP: allowInsecurePublicHttp,
      SMTP_USER: '',
      SMTP_PASS: '',
      GITHUB_CLIENT_SECRET: '',
    },
  });
}

const rejected = validate('http://authora.example:5178');
assert.notEqual(rejected.status, 0, 'public HTTP must be rejected by default');
assert.match(
  `${rejected.stdout}${rejected.stderr}`,
  /FRONTEND_URL must use HTTPS outside local development/,
);

const explicitlyAllowed = validate('http://authora.example:5178', 'true');
assert.equal(
  explicitlyAllowed.status,
  0,
  `explicit staging override should allow public HTTP:\n${explicitlyAllowed.stderr}`,
);

const securePublicUrl = validate('https://authora.example');
assert.equal(securePublicUrl.status, 0, `public HTTPS must remain valid:\n${securePublicUrl.stderr}`);

console.log('Environment validation tests passed');
