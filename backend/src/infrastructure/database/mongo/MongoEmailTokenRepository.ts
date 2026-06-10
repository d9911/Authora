import { EmailTokenModel } from './models';
import {
  EmailTokenRecord,
  EmailTokenRepository,
  EmailTokenType,
} from '../../../modules/auth/domain/EmailTokenRepository';

// Re-export for backward compatibility with existing imports.
export type { EmailTokenRecord, EmailTokenRepository, EmailTokenType };

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
