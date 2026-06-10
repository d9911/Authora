import {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../modules/auth/domain/RefreshTokenRepository';
import { getSqlite } from './connection';
import { nowIso } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(row: any): RefreshTokenRecord {
  return {
    id: String(row.id),
    userId: String(row.userId),
    tokenHash: row.tokenHash,
    expiresAt: new Date(row.expiresAt),
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : undefined,
    createdAt: new Date(row.createdAt),
  };
}

export class SqliteRefreshTokenRepository implements RefreshTokenRepository {
  async save(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    const db = getSqlite();
    const info = db
      .prepare(
        `INSERT INTO refresh_tokens (userId, tokenHash, expiresAt, createdAt)
         VALUES (?, ?, ?, ?)`,
      )
      .run(Number(userId), tokenHash, expiresAt.toISOString(), nowIso());
    const row = db
      .prepare('SELECT * FROM refresh_tokens WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    return map(row);
  }

  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const row = getSqlite()
      .prepare(
        `SELECT * FROM refresh_tokens
         WHERE tokenHash = ? AND revokedAt IS NULL AND expiresAt > ?`,
      )
      .get(tokenHash, nowIso());
    return row ? map(row) : null;
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    getSqlite()
      .prepare('UPDATE refresh_tokens SET revokedAt = ? WHERE tokenHash = ? AND revokedAt IS NULL')
      .run(nowIso(), tokenHash);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    getSqlite()
      .prepare('UPDATE refresh_tokens SET revokedAt = ? WHERE userId = ? AND revokedAt IS NULL')
      .run(nowIso(), Number(userId));
  }
}
