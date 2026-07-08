import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const service = readFileSync(
  resolve(root, 'backend/src/modules/auth/oauth/TelegramBotService.ts'),
  'utf8',
);

const getBotUrlStart = service.indexOf('  async getBotUrl(): Promise<string> {');
const startMethodStart = service.indexOf('  /** Start the long-poll loop', getBotUrlStart);
assert.notEqual(getBotUrlStart, -1, 'TelegramBotService should define getBotUrl()');
assert.notEqual(startMethodStart, -1, 'TelegramBotService should define start() after getBotUrl()');

const getBotUrl = service.slice(getBotUrlStart, startMethodStart);
const configuredGuard = getBotUrl.indexOf("if (!this.isConfigured()) return '';");
const explicitUrl = getBotUrl.indexOf('const explicit');
const usernameLookup = getBotUrl.indexOf('const username = await this.resolveBotUsername();');
const usernameGuard = getBotUrl.indexOf("if (!username) return '';");
const explicitReturn = getBotUrl.indexOf('if (explicit) return explicit;');

assert.ok(
  configuredGuard !== -1 && explicitUrl !== -1 && configuredGuard < explicitUrl,
  'getBotUrl() must reject missing TELEGRAM_BOT_TOKEN before using TELEGRAM_BOT_URL.',
);
assert.ok(
  usernameLookup !== -1 &&
    usernameGuard !== -1 &&
    explicitReturn !== -1 &&
    usernameLookup < usernameGuard &&
    usernameGuard < explicitReturn,
  'getBotUrl() must verify the bot token with getMe before returning an explicit TELEGRAM_BOT_URL.',
);
