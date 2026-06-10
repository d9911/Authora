import {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../modules/auth/domain/RefreshTokenRepository';
import { RefreshTokenModel } from './models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(doc: any): RefreshTokenRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt ?? undefined,
    createdAt: doc.createdAt,
  };
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  async save(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    const doc = await RefreshTokenModel.create({ userId, tokenHash, expiresAt });
    return map(doc);
  }

  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const doc = await RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();
    return doc ? map(doc) : null;
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }
}
