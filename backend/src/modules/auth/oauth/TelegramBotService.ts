import { env } from '../../../config/env';
import { TelegramTicketStore } from './TelegramTicketStore';

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}
interface TgMessage {
  text?: string;
  from?: TgUser;
  chat?: { id: number };
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}
interface TgApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

/**
 * Telegram bot deep-link login flow.
 *
 *   user clicks "Continue with Telegram"
 *     -> open https://t.me/<bot>?start=<ticket>
 *     -> user taps Start; Telegram delivers "/start <ticket>" to the bot
 *     -> this poller resolves the ticket with the (Telegram-verified) user
 *     -> frontend poll picks it up and logs in
 *
 * Uses long polling (getUpdates) so no public webhook URL is needed — works on
 * localhost. The bot token authenticates the API, so the user identity is
 * trustworthy without a signature check.
 */
export class TelegramBotService {
  private offset = 0;
  private running = false;
  private api = '';
  private username: string | null = null;
  private lastPollError: string | null = null;

  constructor(private readonly tickets: TelegramTicketStore) {
    if (env.telegram.botToken) {
      this.api = `https://api.telegram.org/bot${env.telegram.botToken}`;
    }
  }

  isConfigured(): boolean {
    return Boolean(env.telegram.botToken);
  }

  /**
   * Resolve the public bot deep-link base (https://t.me/<username>).
   * Priority: explicit TELEGRAM_BOT_URL, else derived from the token via getMe.
   * Cached after the first successful lookup.
   */
  async getBotUrl(): Promise<string> {
    const explicit = (env.telegram.botUrl ?? '').replace(/\/$/, '');
    if (explicit) return explicit;
    if (!this.isConfigured()) return '';
    if (this.username) return `https://t.me/${this.username}`;
    try {
      const res = await fetch(`${this.api}/getMe`, { signal: AbortSignal.timeout(8000) });
      const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
      if (json.ok && json.result?.username) {
        this.username = json.result.username;
        return `https://t.me/${this.username}`;
      }
    } catch {
      /* network/timeout — fall through */
    }
    return '';
  }

  /** Start the long-poll loop (no-op if the bot token is not configured). */
  start(): void {
    if (!this.isConfigured() || this.running) return;
    this.running = true;
    // eslint-disable-next-line no-console
    console.log('[telegram-bot] long-poll started');
    // Warm the username cache so deep-links work without TELEGRAM_BOT_URL.
    void this.getBotUrl().then((u) => {
      if (u) console.log(`[telegram-bot] deep-link base: ${u}`);
    });
    void this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const res = await fetch(`${this.api}/getUpdates?timeout=30&offset=${this.offset}`, {
          // generous timeout for long polling
          signal: AbortSignal.timeout(40000),
        });
        const json = (await res.json()) as TgApiResponse<TgUpdate[]>;
        if (json.ok && json.result) {
          if (this.lastPollError) {
            this.lastPollError = null;
            // eslint-disable-next-line no-console
            console.log('[telegram-bot] getUpdates recovered');
          }
          for (const upd of json.result) {
            this.offset = upd.update_id + 1;
            this.handleUpdate(upd);
          }
        } else {
          this.logPollIssue(json.description ?? 'Telegram returned ok=false for getUpdates');
          await new Promise((r) => setTimeout(r, 2000));
        }
      } catch (err) {
        this.logPollIssue(err instanceof Error ? err.message : 'getUpdates failed');
        // network hiccup / timeout — back off briefly and retry
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private handleUpdate(upd: TgUpdate): void {
    const msg = upd.message;
    if (!msg?.text || !msg.from) return;
    const m = msg.text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?/);
    if (!m) return;
    const ticketToken = m[1];
    const from = msg.from;
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || undefined;

    if (ticketToken) {
      const ok = this.tickets.resolve(ticketToken, {
        telegramId: String(from.id),
        name,
        username: from.username,
      });
      // eslint-disable-next-line no-console
      console.log(`[telegram-bot] /start with ticket: ${ok ? 'resolved' : 'expired-or-missing'}`);
      void this.reply(
        msg.chat?.id,
        ok ? '✅ You are signed in. Return to the website.' : '⚠️ This login link expired. Please try again.',
      );
    } else {
      // eslint-disable-next-line no-console
      console.log('[telegram-bot] /start without ticket');
      void this.reply(msg.chat?.id, 'Open the website and press “Continue with Telegram”.');
    }
  }

  private async reply(chatId: number | undefined, text: string): Promise<void> {
    if (!chatId) return;
    try {
      const res = await fetch(`${this.api}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const json = (await res.json()) as TgApiResponse<unknown>;
      if (!json.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[telegram-bot] sendMessage failed: ${json.description ?? 'ok=false'}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[telegram-bot] sendMessage failed: ${err instanceof Error ? err.message : 'request failed'}`,
      );
    }
  }

  private logPollIssue(message: string): void {
    if (this.lastPollError === message) return;
    this.lastPollError = message;
    // eslint-disable-next-line no-console
    console.warn(`[telegram-bot] getUpdates issue: ${message}`);
  }
}
