import {
  RecoveryChannel,
  RecoveryGrantRecord,
  RecoveryGrantRepository,
} from '../../../modules/auth/domain/RecoveryGrantRepository';
import { getSqlite } from './connection';
import { nowIso } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(row: any): RecoveryGrantRecord {
  return {
    id: String(row.id),
    userId: String(row.userId),
    channel: row.channel,
    authVersion: Number(row.authVersion),
    expiresAt: new Date(row.expiresAt),
    usedAt: row.usedAt ? new Date(row.usedAt) : undefined,
  };
}

export class SqliteRecoveryGrantRepository implements RecoveryGrantRepository {
  async create(
    userId: string,
    tokenHash: string,
    channel: RecoveryChannel,
    authVersion: number,
    expiresAt: Date,
  ): Promise<void> {
    getSqlite()
      .prepare(
        `INSERT INTO recovery_grants
         (userId, tokenHash, channel, authVersion, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(Number(userId), tokenHash, channel, authVersion, expiresAt.toISOString(), nowIso());
  }

  async consumeValid(tokenHash: string): Promise<RecoveryGrantRecord | null> {
    const db = getSqlite();
    const consume = db.transaction(() => {
      const row = db
        .prepare(
          `SELECT * FROM recovery_grants
           WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > ?`,
        )
        .get(tokenHash, nowIso());
      if (!row) return null;
      const result = db
        .prepare('UPDATE recovery_grants SET usedAt = ? WHERE id = ? AND usedAt IS NULL')
        .run(nowIso(), (row as { id: number }).id);
      return result.changes === 1 ? row : null;
    });
    const row = consume();
    return row ? map(row) : null;
  }

  async invalidateForUser(userId: string): Promise<void> {
    getSqlite()
      .prepare('UPDATE recovery_grants SET usedAt = ? WHERE userId = ? AND usedAt IS NULL')
      .run(nowIso(), Number(userId));
  }
}
