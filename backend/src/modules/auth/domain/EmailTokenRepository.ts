export type EmailTokenType = 'verify_email' | 'reset_password';

export interface EmailTokenRecord {
  id: string;
  userId: string;
  type: EmailTokenType;
  expiresAt: Date;
  usedAt?: Date;
}

/**
 * One-time tokens for email confirmation and password reset.
 * Only the hash is stored; the raw token travels via the email link.
 *
 * Persistence-agnostic: implemented by Mongo and SQLite alike.
 */
export interface EmailTokenRepository {
  create(userId: string, tokenHash: string, type: EmailTokenType, expiresAt: Date): Promise<void>;
  findValid(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null>;
  markUsed(id: string): Promise<void>;
  invalidateForUser(userId: string, type: EmailTokenType): Promise<void>;
}
