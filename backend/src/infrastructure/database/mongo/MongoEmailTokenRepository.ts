import { EmailTokenModel } from './models';

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
 * Only the hash is stored; the raw token travels via email link.
 */
export interface EmailTokenRepository {
  create(userId: string, tokenHash: string, type: EmailTokenType, expiresAt: Date): Promise<void>;
  findValid(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null>;
  markUsed(id: string): Promise<void>;
  invalidateForUser(userId: string, type: EmailTokenType): Promise<void>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(doc: any): EmailTokenRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    type: doc.type,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt ?? undefined,
  };
}

export class MongoEmailTokenRepository implements EmailTokenRepository {
  async create(
    userId: string,
    tokenHash: string,
    type: EmailTokenType,
    expiresAt: Date,
  ): Promise<void> {
    await EmailTokenModel.create({ userId, tokenHash, type, expiresAt });
  }

  async findValid(tokenHash: string, type: EmailTokenType): Promise<EmailTokenRecord | null> {
    const doc = await EmailTokenModel.findOne({
      tokenHash,
      type,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();
    return doc ? map(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await EmailTokenModel.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  }

  async invalidateForUser(userId: string, type: EmailTokenType): Promise<void> {
    await EmailTokenModel.updateMany(
      { userId, type, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );
  }
}
