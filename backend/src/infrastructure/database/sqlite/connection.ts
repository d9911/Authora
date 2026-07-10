import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { env } from '../../../config/env'

export type SqliteDb = Database.Database

let db: SqliteDb | null = null

/**
 * Opens (and lazily creates) the SQLite database file and applies the schema.
 * better-sqlite3 is synchronous; the repository layer wraps results in
 * Promises so it satisfies the same async interfaces as the Mongo layer.
 */
export function getSqlite(): SqliteDb {
  if (db) return db

  const file = env.sqlite.file
  if (file !== ':memory:') {
    const dir = path.dirname(path.resolve(file))
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  applySchema(db)
  return db
}

export function applySchema(database: SqliteDb): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT,
      email           TEXT NOT NULL UNIQUE,
      emailKind       TEXT NOT NULL DEFAULT 'contactable',
      password        TEXT,
      nickname        TEXT,
      phoneNumber     TEXT,
      telegramId      TEXT,
      avatarUrl       TEXT,
      emailVerified   INTEGER NOT NULL DEFAULT 0,
      twoFactorEnabled INTEGER NOT NULL DEFAULT 0,
      twoFactorSecret TEXT,
      twoFactorRecoveryCodeHashes TEXT,
      githubId        TEXT,
      authVersion     INTEGER NOT NULL DEFAULT 0,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_github ON users(githubId);
    CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegramId);

	    CREATE TABLE IF NOT EXISTS profiles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      userId       INTEGER NOT NULL UNIQUE,
      bio          TEXT,
      isVerified   INTEGER NOT NULL DEFAULT 0,
      description  TEXT,
      coverSrc     TEXT,
      cityId       INTEGER,
      dateOfBirth  TEXT,
      gender       TEXT,
      address      TEXT,
      timezone     TEXT,
      createdAt    TEXT NOT NULL,
      updatedAt    TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
	    );

	    CREATE TABLE IF NOT EXISTS profile_images (
	      id          INTEGER PRIMARY KEY AUTOINCREMENT,
	      userId      INTEGER NOT NULL,
	      kind        TEXT NOT NULL,
	      contentType TEXT NOT NULL,
	      data        BLOB NOT NULL,
	      sizeBytes   INTEGER NOT NULL,
	      width       INTEGER NOT NULL,
	      height      INTEGER NOT NULL,
	      etag        TEXT NOT NULL,
	      createdAt   TEXT NOT NULL,
	      updatedAt   TEXT NOT NULL,
	      UNIQUE(userId, kind),
	      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
	    );
	    CREATE INDEX IF NOT EXISTS idx_profile_images_user_kind ON profile_images(userId, kind);

	    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      userId     INTEGER NOT NULL,
      tokenHash  TEXT NOT NULL,
      expiresAt  TEXT NOT NULL,
      revokedAt  TEXT,
      createdAt  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(tokenHash);
    CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(userId);

    CREATE TABLE IF NOT EXISTS email_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      userId     INTEGER NOT NULL,
      tokenHash  TEXT NOT NULL,
      type       TEXT NOT NULL,
      expiresAt  TEXT NOT NULL,
      usedAt     TEXT,
      targetEmail TEXT,
      createdAt  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_hash ON email_tokens(tokenHash);

    CREATE TABLE IF NOT EXISTS recovery_grants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      userId      INTEGER NOT NULL,
      tokenHash   TEXT NOT NULL UNIQUE,
      channel     TEXT NOT NULL,
      authVersion INTEGER NOT NULL,
      expiresAt   TEXT NOT NULL,
      usedAt      TEXT,
      createdAt   TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_recovery_hash ON recovery_grants(tokenHash);
    CREATE INDEX IF NOT EXISTS idx_recovery_user ON recovery_grants(userId);

    CREATE TABLE IF NOT EXISTS telegram_tickets (
      token              TEXT PRIMARY KEY,
      status             TEXT NOT NULL,
      purpose            TEXT NOT NULL,
      linkUserId         TEXT,
      confirmationCode   TEXT,
      telegramId         TEXT,
      telegramName       TEXT,
      telegramUsername   TEXT,
      createdAt          TEXT NOT NULL,
      expiresAt          TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_telegram_tickets_expires ON telegram_tickets(expiresAt);

    CREATE TABLE IF NOT EXISTS countries (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      code      TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      countryId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (countryId) REFERENCES countries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_regions_country ON regions(countryId);

    CREATE TABLE IF NOT EXISTS cities (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      countryId INTEGER,
      regionId  INTEGER,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(countryId);
    CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(regionId);
  `)

  const userColumns = database.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
  if (!userColumns.some((column) => column.name === 'emailKind')) {
    database.exec("ALTER TABLE users ADD COLUMN emailKind TEXT NOT NULL DEFAULT 'contactable'")
  }
  if (!userColumns.some((column) => column.name === 'authVersion')) {
    database.exec('ALTER TABLE users ADD COLUMN authVersion INTEGER NOT NULL DEFAULT 0')
  }
  if (!userColumns.some((column) => column.name === 'twoFactorRecoveryCodeHashes')) {
    database.exec('ALTER TABLE users ADD COLUMN twoFactorRecoveryCodeHashes TEXT')
  }
  const emailTokenColumns = database.prepare('PRAGMA table_info(email_tokens)').all() as Array<{
    name: string
  }>
  if (!emailTokenColumns.some((column) => column.name === 'targetEmail')) {
    database.exec('ALTER TABLE email_tokens ADD COLUMN targetEmail TEXT')
  }

  database.prepare(
    `UPDATE users
     SET emailKind = 'synthetic'
     WHERE email LIKE 'tg_%@telegram.local'
        OR email LIKE 'gh_%@users.noreply.github.com'`,
  ).run()
}

export async function connectSqlite(): Promise<void> {
  getSqlite()
  // eslint-disable-next-line no-console
  console.log(`[sqlite] ready: ${env.sqlite.file}`)
}

export async function disconnectSqlite(): Promise<void> {
  if (db) {
    db.close()
    db = null
  }
}
