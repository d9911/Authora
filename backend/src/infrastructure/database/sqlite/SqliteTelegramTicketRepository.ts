import crypto from 'crypto';
import {
  CreateTelegramTicketInput,
  TelegramTicket,
  TelegramTicketRepository,
  TelegramVerifiedUser,
} from '../../../modules/auth/domain/TelegramTicketRepository';
import { getSqlite } from './connection';

const TTL_MS = 5 * 60 * 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(row: any): TelegramTicket {
  return {
    token: row.token,
    status: row.status,
    purpose: row.purpose,
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
    linkUserId: row.linkUserId ?? undefined,
    confirmationCode: row.confirmationCode ?? undefined,
    user: row.telegramId
      ? {
          telegramId: row.telegramId,
          name: row.telegramName ?? undefined,
          username: row.telegramUsername ?? undefined,
        }
      : undefined,
  };
}

export class SqliteTelegramTicketRepository implements TelegramTicketRepository {
  async create(input: CreateTelegramTicketInput): Promise<TelegramTicket> {
    const createdAt = new Date();
    const ticket: TelegramTicket = {
      token: crypto.randomBytes(18).toString('base64url'),
      status: 'pending',
      purpose: input.purpose,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + TTL_MS),
      linkUserId: input.linkUserId,
      confirmationCode: input.confirmationCode,
    };
    getSqlite()
      .prepare(
        `INSERT INTO telegram_tickets
         (token, status, purpose, linkUserId, confirmationCode, createdAt, expiresAt)
         VALUES (@token, @status, @purpose, @linkUserId, @confirmationCode, @createdAt, @expiresAt)`,
      )
      .run({
        ...ticket,
        linkUserId: ticket.linkUserId ?? null,
        confirmationCode: ticket.confirmationCode ?? null,
        createdAt: ticket.createdAt.toISOString(),
        expiresAt: ticket.expiresAt.toISOString(),
      });
    return ticket;
  }

  async get(token: string): Promise<TelegramTicket | undefined> {
    const db = getSqlite();
    const row = db.prepare('SELECT * FROM telegram_tickets WHERE token = ?').get(token);
    if (!row) return undefined;
    const ticket = map(row);
    if (ticket.expiresAt.getTime() <= Date.now() && ticket.status !== 'expired') {
      db.prepare("UPDATE telegram_tickets SET status = 'expired' WHERE token = ?").run(token);
      return { ...ticket, status: 'expired' };
    }
    return ticket;
  }

  async resolve(token: string, user: TelegramVerifiedUser): Promise<boolean> {
    const result = getSqlite()
      .prepare(
        `UPDATE telegram_tickets
         SET status = 'done', telegramId = ?, telegramName = ?, telegramUsername = ?
         WHERE token = ? AND status = 'pending' AND expiresAt > ?`,
      )
      .run(
        user.telegramId,
        user.name ?? null,
        user.username ?? null,
        token,
        new Date().toISOString(),
      );
    return result.changes === 1;
  }

  async cancel(token: string): Promise<boolean> {
    const result = getSqlite()
      .prepare(
        `UPDATE telegram_tickets SET status = 'cancelled'
         WHERE token = ? AND status = 'pending' AND expiresAt > ?`,
      )
      .run(token, new Date().toISOString());
    return result.changes === 1;
  }

  async consume(token: string): Promise<void> {
    getSqlite().prepare('DELETE FROM telegram_tickets WHERE token = ?').run(token);
  }
}

