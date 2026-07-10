export interface TelegramVerifiedUser {
  telegramId: string;
  name?: string;
  username?: string;
}

export type TelegramTicketPurpose = 'login' | 'link' | 'recovery';
export type TicketStatus = 'pending' | 'done' | 'cancelled' | 'expired';

export interface CreateTelegramTicketInput {
  purpose: TelegramTicketPurpose;
  linkUserId?: string;
  confirmationCode?: string;
}

export interface TelegramTicket {
  token: string;
  status: TicketStatus;
  purpose: TelegramTicketPurpose;
  createdAt: number;
  /** If set, this is a LINK flow for the given authenticated user. */
  linkUserId?: string;
  /** Short code shown both in browser and bot for recovery intent confirmation. */
  confirmationCode?: string;
  /** Filled when the user taps Start in the bot. */
  user?: TelegramVerifiedUser;
}

const TTL_MS = 5 * 60 * 1000; // tickets live 5 minutes

/**
 * In-memory store for one-time Telegram bot-login tickets. A ticket is created
 * when the user clicks "Continue with Telegram", embedded in the bot deep-link
 * (?start=<token>), and resolved by the bot when the user taps Start.
 */
export class TelegramTicketStore {
  private tickets = new Map<string, TelegramTicket>();

  create(input: CreateTelegramTicketInput): TelegramTicket {
    this.gc();
    const token = cryptoRandom();
    const ticket: TelegramTicket = {
      token,
      status: 'pending',
      purpose: input.purpose,
      createdAt: Date.now(),
      linkUserId: input.linkUserId,
      confirmationCode: input.confirmationCode,
    };
    this.tickets.set(token, ticket);
    return ticket;
  }

  get(token: string): TelegramTicket | undefined {
    const t = this.tickets.get(token);
    if (!t) return undefined;
    if (Date.now() - t.createdAt > TTL_MS) {
      t.status = 'expired';
    }
    return t;
  }

  resolve(token: string, user: TelegramVerifiedUser): boolean {
    const t = this.tickets.get(token);
    if (!t || t.status !== 'pending') return false;
    if (Date.now() - t.createdAt > TTL_MS) {
      t.status = 'expired';
      return false;
    }
    t.user = user;
    t.status = 'done';
    return true;
  }

  cancel(token: string): boolean {
    const ticket = this.tickets.get(token);
    if (!ticket || ticket.status !== 'pending') return false;
    ticket.status = 'cancelled';
    return true;
  }

  /** Once consumed by the frontend, drop the ticket. */
  consume(token: string): void {
    this.tickets.delete(token);
  }

  private gc(): void {
    const now = Date.now();
    for (const [k, t] of this.tickets) {
      if (now - t.createdAt > TTL_MS) this.tickets.delete(k);
    }
  }
}

function cryptoRandom(): string {
  // 24 bytes -> short, URL-safe, fits Telegram's /start payload limit (64 chars).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.randomBytes(18).toString('base64url');
}
