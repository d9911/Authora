import {
  EmailTokenRecord,
  EmailTokenRepository,
  EmailTokenType,
} from '../../../modules/auth/domain/EmailTokenRepository';
import { getSqlite } from './connection';
import { nowIso } from './mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(row: any): EmailTokenRecord {
  return {
    id: String(row.id),
    userId: String(row.userId),
    type: row.type as EmailTokenType,
    expiresAt: new Date(row.expiresAt),
    usedAt: row.usedAt ? new Date(row.usedAt) : undefined,
  };
}

export class SqliteEmailTokenRepository implements EmailTokenRepository {
  async create(
    userId: string,
    tokenHash: string,
    type: EmailTokenType,
    expiresAt: Date,
  ): Promise<void> {
    getSqlite()
      .prepare(
        `INSERT INTO email_tokens (userId, tokenHash, type, expiresAt, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(Number(userId), tokenHash, type, expiresAt.toISOString(), nowIso());
  }

  async findValid(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null> {
    const row = getSqlite()
      .prepare(
        `SELECT * FROM email_tokens
         WHERE tokenHash = ? AND type = ? AND usedAt IS NULL AND expiresAt > ?`,
      )
      .get(tokenHash, type, nowIso());
    return row ? map(row) : null;
  }

  async markUsed(id: string): Promise<void> {
    getSqlite().prepare('UPDATE email_tokens SET usedAt = ? WHERE id = ?').run(nowIso(), Number(id));
  }

  async invalidateForUser(userId: string, type: EmailTokenType): Promise<void> {
    getSqlite()
      .prepare(
        'UPDATE email_tokens SET usedAt = ? WHERE userId = ? AND type = ? AND usedAt IS NULL',
      )
      .run(nowIso(), Number(userId), type);
  }
}
