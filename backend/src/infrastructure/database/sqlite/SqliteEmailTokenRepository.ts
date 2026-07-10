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
    targetEmail: row.targetEmail ?? undefined,
  };
}

export class SqliteEmailTokenRepository implements EmailTokenRepository {
  async create(
    userId: string,
    tokenHash: string,
    type: EmailTokenType,
    expiresAt: Date,
    targetEmail?: string,
  ): Promise<void> {
    getSqlite()
      .prepare(
        `INSERT INTO email_tokens (userId, tokenHash, type, expiresAt, targetEmail, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(Number(userId), tokenHash, type, expiresAt.toISOString(), targetEmail ?? null, nowIso());
  }

  async findValid(
    tokenHash: string,
    type: EmailTokenType,
    userId?: string,
  ): Promise<EmailTokenRecord | null> {
    const row = getSqlite()
      .prepare(
        `SELECT * FROM email_tokens
         WHERE tokenHash = ? AND type = ? AND usedAt IS NULL AND expiresAt > ?
           AND (? IS NULL OR userId = ?)`,
      )
      .get(tokenHash, type, nowIso(), userId ? Number(userId) : null, userId ? Number(userId) : null);
    return row ? map(row) : null;
  }

  async consumeValid(
    tokenHash: string,
    type: EmailTokenType,
    userId?: string,
  ): Promise<EmailTokenRecord | null> {
    const db = getSqlite();
    const consume = db.transaction(() => {
      const row = db
        .prepare(
          `SELECT * FROM email_tokens
           WHERE tokenHash = ? AND type = ? AND usedAt IS NULL AND expiresAt > ?
             AND (? IS NULL OR userId = ?)`,
        )
        .get(
          tokenHash,
          type,
          nowIso(),
          userId ? Number(userId) : null,
          userId ? Number(userId) : null,
        );
      if (!row) return null;
      const result = db
        .prepare('UPDATE email_tokens SET usedAt = ? WHERE id = ? AND usedAt IS NULL')
        .run(nowIso(), (row as { id: number }).id);
      return result.changes === 1 ? row : null;
    });
    const row = consume();
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
