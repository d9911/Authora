import { env } from '../../../config/env';
import { TelegramTicketStore } from './TelegramTicketStore';

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
interface TgMessage {
  message_id?: number;
  text?: string;
  from?: TgUser;
  chat?: { id: number };
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}
interface TgApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

type ReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
};

const CONFIRM_PREFIX = 'authora_auth_ok:';
const CANCEL_PREFIX = 'authora_auth_cancel:';

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
    if (!this.isConfigured()) return '';
    const explicit = (env.telegram.botUrl ?? '').replace(/\/$/, '');
    const username = await this.resolveBotUsername();
    if (!username) return '';
    if (explicit) return explicit;
    return `https://t.me/${username}`;
  }

  private async resolveBotUsername(): Promise<string> {
    if (this.username) return this.username;
    try {
      const res = await fetch(`${this.api}/getMe`, { signal: AbortSignal.timeout(8000) });
      const json = (await res.json()) as { ok: boolean; result?: { username?: string } };
      if (json.ok && json.result?.username) {
        this.username = json.result.username;
        return this.username;
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
    if (upd.callback_query) {
      void this.handleCallback(upd.callback_query);
      return;
    }

    const msg = upd.message;
    if (!msg?.text || !msg.from) return;
    const m = msg.text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?/);
    if (!m) return;
    const ticketToken = m[1];
    const from = msg.from;

    if (ticketToken) {
      // eslint-disable-next-line no-console
      console.log('[telegram-bot] /start with ticket: confirmation requested');
      void this.reply(
        msg.chat?.id,
        this.buildConfirmationText(from),
        {
          inline_keyboard: [
            [
              { text: 'Да, авторизоваться', callback_data: `${CONFIRM_PREFIX}${ticketToken}` },
              { text: 'Отмена', callback_data: `${CANCEL_PREFIX}${ticketToken}` },
            ],
          ],
        },
      );
    } else {
      // eslint-disable-next-line no-console
      console.log('[telegram-bot] /start without ticket');
      void this.reply(msg.chat?.id, 'Open the website and press “Continue with Telegram”.');
    }
  }

  private async handleCallback(query: TgCallbackQuery): Promise<void> {
    const data = query.data ?? '';
    const isConfirm = data.startsWith(CONFIRM_PREFIX);
    const isCancel = data.startsWith(CANCEL_PREFIX);
    if (!isConfirm && !isCancel) return;

    const token = data.slice((isConfirm ? CONFIRM_PREFIX : CANCEL_PREFIX).length);
    if (!token) return;

    if (isCancel) {
      // eslint-disable-next-line no-console
      console.log('[telegram-bot] authorization cancelled by user');
      await this.answerCallback(query.id, 'Авторизация отменена.');
      await this.editMessage(query.message, 'Авторизация Authora отменена.');
      return;
    }

    const ok = this.tickets.resolve(token, {
      telegramId: String(query.from.id),
      name: this.displayName(query.from),
      username: query.from.username,
    });
    // eslint-disable-next-line no-console
    console.log(`[telegram-bot] confirmation: ${ok ? 'resolved' : 'expired-or-missing'}`);
    await this.answerCallback(
      query.id,
      ok ? 'Авторизация подтверждена.' : 'Ссылка авторизации устарела.',
    );
    await this.editMessage(
      query.message,
      ok
        ? this.buildConfirmedText(query.from)
        : '⚠️ Эта ссылка авторизации устарела. Попробуйте снова на сайте.',
    );
  }

  private async reply(chatId: number | undefined, text: string, replyMarkup?: ReplyMarkup): Promise<void> {
    if (!chatId) return;
    try {
      const res = await fetch(`${this.api}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
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

  private async answerCallback(callbackQueryId: string, text: string): Promise<void> {
    try {
      await fetch(`${this.api}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[telegram-bot] answerCallbackQuery failed: ${err instanceof Error ? err.message : 'request failed'}`,
      );
    }
  }

  private async editMessage(message: TgMessage | undefined, text: string): Promise<void> {
    if (!message?.chat?.id || !message.message_id) return;
    try {
      await fetch(`${this.api}/editMessageText`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text,
          reply_markup: { inline_keyboard: [] },
        }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `[telegram-bot] editMessageText failed: ${err instanceof Error ? err.message : 'request failed'}`,
      );
    }
  }

  private logPollIssue(message: string): void {
    if (this.lastPollError === message) return;
    this.lastPollError = message;
    // eslint-disable-next-line no-console
    console.warn(`[telegram-bot] getUpdates issue: ${message}`);
  }

  private buildConfirmationText(user: TgUser): string {
    return [
      'Вы готовы авторизоваться в приложении Authora через свой Telegram аккаунт?',
      '',
      'В систему Authora будут записаны эти Telegram-данные:',
      '',
      ...this.buildUserDataLines(user),
    ].join('\n');
  }

  private buildConfirmedText(user: TgUser): string {
    return [
      '✅ Авторизация Authora подтверждена.',
      '',
      'В систему Authora будут записаны эти Telegram-данные:',
      '',
      ...this.buildUserDataLines(user),
      '',
      'Вернитесь на сайт.',
    ].join('\n');
  }

  private buildUserDataLines(user: TgUser): string[] {
    const username = user.username ? `@${user.username}` : 'не указан';
    const language = this.formatLanguage(user.language_code);
    return [
      '👤 Пользователь',
      '',
      `🆔 ID: ${user.id}`,
      `🔗 Юзернейм: ${username}`,
      `📝 Имя: ${this.displayName(user) ?? 'не указано'}`,
      `🏳️ Язык: ${language}`,
      '',
      '📅 Регистрация: недоступна через Telegram Bot API',
    ];
  }

  private displayName(user: TgUser): string | undefined {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined;
  }

  private formatLanguage(languageCode: string | undefined): string {
    if (!languageCode) return 'не указан';
    if (languageCode.toLowerCase() === 'ru') return 'RU 🇷🇺';
    return languageCode.toUpperCase();
  }
}
