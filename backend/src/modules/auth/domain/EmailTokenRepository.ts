export type EmailTokenType = 'verify_email' | 'reset_password' | 'change_email';

export interface EmailTokenRecord {
  id: string;
  userId: string;
  type: EmailTokenType;
  expiresAt: Date;
  usedAt?: Date;
  targetEmail?: string;
}

/**
 * One-time tokens for email confirmation and password reset.
 * Only the hash is stored; the raw token travels via the email link.
 *
 * Persistence-agnostic: implemented by Mongo and SQLite alike.
 */
export interface EmailTokenRepository {
  create(
    userId: string,
    tokenHash: string,
    type: EmailTokenType,
    expiresAt: Date,
    targetEmail?: string,
  ): Promise<void>;
  findValid(
    tokenHash: string,
    type: EmailTokenType,
    userId?: string,
  ): Promise<EmailTokenRecord | null>;
  consumeValid(
    tokenHash: string,
    type: EmailTokenType,
    userId?: string,
  ): Promise<EmailTokenRecord | null>;
  markUsed(id: string): Promise<void>;
  invalidateForUser(userId: string, type: EmailTokenType): Promise<void>;
}
