import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

for (const path of [
  'backend/src/modules/auth/domain/TelegramTicketRepository.ts',
  'backend/src/infrastructure/database/mongo/MongoTelegramTicketRepository.ts',
  'backend/src/infrastructure/database/sqlite/SqliteTelegramTicketRepository.ts',
]) {
  assert.ok(existsSync(resolve(root, path)), `Missing persistent Telegram ticket file: ${path}`);
}

const repositories = read('backend/src/infrastructure/database/repositories/index.ts');
const container = read('backend/src/app/container.ts');
const authUseCases = read('backend/src/modules/auth/use-cases/AuthUseCases.ts');
const bot = read('backend/src/modules/auth/oauth/TelegramBotService.ts');

assert.match(repositories, /telegramTickets:\s*TelegramTicketRepository/);
assert.match(repositories, /MongoTelegramTicketRepository/);
assert.match(repositories, /SqliteTelegramTicketRepository/);
assert.match(container, /telegramTickets:\s*repos\.telegramTickets/);
assert.doesNotMatch(container, /new TelegramTicketStore/);
assert.match(authUseCases, /await this\.deps\.telegramTickets\.create/);
assert.match(authUseCases, /await this\.deps\.telegramTickets\.get/);
assert.match(bot, /await this\.tickets\.resolve/);

console.log('Account recovery persistence checks passed');

