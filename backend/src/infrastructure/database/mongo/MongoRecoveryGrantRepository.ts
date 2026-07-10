import {
  RecoveryChannel,
  RecoveryGrantRecord,
  RecoveryGrantRepository,
} from '../../../modules/auth/domain/RecoveryGrantRepository';
import { RecoveryGrantModel } from './models';

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(doc: any): RecoveryGrantRecord {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    channel: doc.channel,
    authVersion: Number(doc.authVersion),
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt ?? undefined,
  };
}

export class MongoRecoveryGrantRepository implements RecoveryGrantRepository {
  async create(
    userId: string,
    tokenHash: string,
    channel: RecoveryChannel,
    authVersion: number,
    expiresAt: Date,
  ): Promise<void> {
    await RecoveryGrantModel.create({ userId, tokenHash, channel, authVersion, expiresAt });
  }

  async consumeValid(tokenHash: string): Promise<RecoveryGrantRecord | null> {
    const doc = await RecoveryGrantModel.findOneAndUpdate(
      {
        tokenHash,
        usedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: false },
    ).lean();
    return doc ? map(doc) : null;
  }

  async invalidateForUser(userId: string): Promise<void> {
    await RecoveryGrantModel.updateMany(
      { userId, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
    );
  }
}
