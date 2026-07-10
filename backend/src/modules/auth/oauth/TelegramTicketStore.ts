import crypto from 'crypto';
import {
  CreateTelegramTicketInput,
  TelegramTicket,
  TelegramTicketRepository,
  TelegramVerifiedUser,
} from '../domain/TelegramTicketRepository';

export type {
  CreateTelegramTicketInput,
  TelegramTicket,
  TelegramTicketPurpose,
  TelegramTicketStatus,
  TelegramVerifiedUser,
} from '../domain/TelegramTicketRepository';

const TTL_MS = 5 * 60 * 1000; // tickets live 5 minutes

/**
 * In-memory store for one-time Telegram bot-login tickets. A ticket is created
 * when the user clicks "Continue with Telegram", embedded in the bot deep-link
 * (?start=<token>), and resolved by the bot when the user taps Start.
 */
export class TelegramTicketStore implements TelegramTicketRepository {
  private tickets = new Map<string, TelegramTicket>();

  async create(input: CreateTelegramTicketInput): Promise<TelegramTicket> {
    this.gc();
    const token = cryptoRandom();
    const createdAt = new Date();
    const ticket: TelegramTicket = {
      token,
      status: 'pending',
      purpose: input.purpose,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + TTL_MS),
      linkUserId: input.linkUserId,
      confirmationCode: input.confirmationCode,
    };
    this.tickets.set(token, ticket);
    return ticket;
  }

  async get(token: string): Promise<TelegramTicket | undefined> {
    const t = this.tickets.get(token);
    if (!t) return undefined;
    if (t.expiresAt.getTime() <= Date.now()) {
      t.status = 'expired';
    }
    return t;
  }

  async resolve(token: string, user: TelegramVerifiedUser): Promise<boolean> {
    const t = this.tickets.get(token);
    if (!t || t.status !== 'pending') return false;
    if (t.expiresAt.getTime() <= Date.now()) {
      t.status = 'expired';
      return false;
    }
    t.user = user;
    t.status = 'done';
    return true;
  }

  async cancel(token: string): Promise<boolean> {
    const ticket = this.tickets.get(token);
    if (!ticket || ticket.status !== 'pending') return false;
    ticket.status = 'cancelled';
    return true;
  }

  /** Once consumed by the frontend, drop the ticket. */
  async consume(token: string): Promise<void> {
    this.tickets.delete(token);
  }

  private gc(): void {
    const now = Date.now();
    for (const [k, t] of this.tickets) {
      if (t.expiresAt.getTime() <= now) this.tickets.delete(k);
    }
  }
}

function cryptoRandom(): string {
  // 24 bytes -> short, URL-safe, fits Telegram's /start payload limit (64 chars).
  return crypto.randomBytes(18).toString('base64url');
}
