export type RecoveryChannel = 'email' | 'telegram';

export interface RecoveryGrantRecord {
  id: string;
  userId: string;
  channel: RecoveryChannel;
  authVersion: number;
  expiresAt: Date;
  usedAt?: Date;
}

export interface RecoveryGrantRepository {
  create(
    userId: string,
    tokenHash: string,
    channel: RecoveryChannel,
    authVersion: number,
    expiresAt: Date,
  ): Promise<void>;
  consumeValid(tokenHash: string): Promise<RecoveryGrantRecord | null>;
  invalidateForUser(userId: string): Promise<void>;
}
