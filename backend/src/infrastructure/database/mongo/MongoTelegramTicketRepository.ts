import crypto from 'crypto';
import {
  CreateTelegramTicketInput,
  TelegramTicket,
  TelegramTicketRepository,
  TelegramVerifiedUser,
} from '../../../modules/auth/domain/TelegramTicketRepository';
import { TelegramTicketModel } from './models';

const TTL_MS = 5 * 60 * 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(doc: any): TelegramTicket {
  return {
    token: doc.token,
    status: doc.status,
    purpose: doc.purpose,
    createdAt: new Date(doc.createdAt),
    expiresAt: new Date(doc.expiresAt),
    linkUserId: doc.linkUserId ?? undefined,
    confirmationCode: doc.confirmationCode ?? undefined,
    user: doc.telegramId
      ? {
          telegramId: doc.telegramId,
          name: doc.telegramName ?? undefined,
          username: doc.telegramUsername ?? undefined,
        }
      : undefined,
  };
}

export class MongoTelegramTicketRepository implements TelegramTicketRepository {
  async create(input: CreateTelegramTicketInput): Promise<TelegramTicket> {
    const createdAt = new Date();
    const doc = await TelegramTicketModel.create({
      token: crypto.randomBytes(18).toString('base64url'),
      status: 'pending',
      purpose: input.purpose,
      linkUserId: input.linkUserId,
      confirmationCode: input.confirmationCode,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + TTL_MS),
    });
    return map(doc);
  }

  async get(token: string): Promise<TelegramTicket | undefined> {
    const doc = await TelegramTicketModel.findOne({ token }).lean();
    if (!doc) return undefined;
    if (new Date(doc.expiresAt).getTime() <= Date.now() && doc.status !== 'expired') {
      await TelegramTicketModel.updateOne({ token }, { $set: { status: 'expired' } });
      return { ...map(doc), status: 'expired' };
    }
    return map(doc);
  }

  async resolve(token: string, user: TelegramVerifiedUser): Promise<boolean> {
    const result = await TelegramTicketModel.updateOne(
      { token, status: 'pending', expiresAt: { $gt: new Date() } },
      {
        $set: {
          status: 'done',
          telegramId: user.telegramId,
          telegramName: user.name,
          telegramUsername: user.username,
        },
      },
    );
    return result.modifiedCount === 1;
  }

  async cancel(token: string): Promise<boolean> {
    const result = await TelegramTicketModel.updateOne(
      { token, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'cancelled' } },
    );
    return result.modifiedCount === 1;
  }

  async consume(token: string): Promise<void> {
    await TelegramTicketModel.deleteOne({ token });
  }
}

