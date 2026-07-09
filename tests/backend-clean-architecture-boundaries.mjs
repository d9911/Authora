import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const authUseCasesPath = 'backend/src/modules/auth/use-cases/AuthUseCases.ts';
const authUseCases = readFileSync(resolve(root, authUseCasesPath), 'utf8');

assert.doesNotMatch(
  authUseCases,
  /from ['"]\.\.\/\.\.\/\.\.\/infrastructure\/database\/mongo\/MongoEmailTokenRepository['"]/,
  `${authUseCasesPath} must import EmailTokenRepository from the auth domain, not from Mongo infrastructure.`,
);
