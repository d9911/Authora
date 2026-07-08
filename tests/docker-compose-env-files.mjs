import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8');
const backendEnvExample = readFileSync(resolve(root, 'backend/.env.example'), 'utf8');

const backendStart = compose.indexOf('  backend:');
const frontendStart = compose.indexOf('  frontend:');
assert.notEqual(backendStart, -1, 'docker-compose.yml should define the backend service');
assert.notEqual(frontendStart, -1, 'docker-compose.yml should define the frontend service');

const backendService = compose.slice(backendStart, frontendStart);

assert.match(
  backendService,
  /^\s*-\s*path:\s*\.\/\.env\s*$/m,
  'Docker backend should load root .env so the root Docker config can provide OAuth/Telegram secrets.',
);
assert.match(
  backendService,
  /^\s*-\s*path:\s*\.\/backend\/\.env\.docker\s*$/m,
  'Docker backend should load backend/.env.docker for Docker-only secret overrides.',
);
assert.doesNotMatch(
  backendService,
  /^\s*-\s*path:\s*\.\/backend\/\.env\s*$/m,
  'Docker backend must not load backend/.env because that file is for local make dev and can contain placeholder or host-only values.',
);

assert.match(
  backendEnvExample,
  /^TELEGRAM_BOT_TOKEN=$/m,
  'backend/.env.example should leave TELEGRAM_BOT_TOKEN empty so local dev does not start the bot with an invalid placeholder token.',
);
