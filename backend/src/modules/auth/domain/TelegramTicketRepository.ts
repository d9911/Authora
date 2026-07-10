export type TelegramTicketPurpose = 'login' | 'link' | 'recovery';
export type TelegramTicketStatus = 'pending' | 'done' | 'cancelled' | 'expired';

export interface TelegramVerifiedUser {
  telegramId: string;
  name?: string;
  username?: string;
}

export interface CreateTelegramTicketInput {
  purpose: TelegramTicketPurpose;
  linkUserId?: string;
  confirmationCode?: string;
}

export interface TelegramTicket {
  token: string;
  status: TelegramTicketStatus;
  purpose: TelegramTicketPurpose;
  createdAt: Date;
  expiresAt: Date;
  linkUserId?: string;
  confirmationCode?: string;
  user?: TelegramVerifiedUser;
}

export interface TelegramTicketRepository {
  create(input: CreateTelegramTicketInput): Promise<TelegramTicket>;
  get(token: string): Promise<TelegramTicket | undefined>;
  resolve(token: string, user: TelegramVerifiedUser): Promise<boolean>;
  cancel(token: string): Promise<boolean>;
  consume(token: string): Promise<void>;
}

