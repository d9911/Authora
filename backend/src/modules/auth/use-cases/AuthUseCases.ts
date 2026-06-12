import { AppError, ErrorCodes } from '../../../core/errors/AppError';
import { PublicUser, toPublicUser } from '../../user/domain/User';
import { UserRepository } from '../../user/domain/UserRepository';
import { ProfileRepository } from '../../profile/domain/ProfileRepository';
import { RefreshTokenRepository } from '../domain/RefreshTokenRepository';
import {
  EmailTokenRepository,
} from '../../../infrastructure/database/mongo/MongoEmailTokenRepository';
import { MailService } from '../../../infrastructure/mail/MailService';
import { TwoFactorService } from '../services/TwoFactorService';
import { TelegramTicketStore } from '../oauth/TelegramTicketStore';
import {
  comparePassword,
  hashPassword,
  randomNumericCode,
  randomToken,
  sha256,
} from '../../../infrastructure/jwt/hash';
import {
  refreshTokenExpiryDate,
  signAccessToken,
  signOAuthToken,
  signRefreshToken,
  verifyOAuthToken,
  verifyRefreshToken,
} from '../../../infrastructure/jwt/jwt';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload extends AuthTokens {
  user: PublicUser;
  needTwoFactor?: false;
}

export interface NeedTwoFactorPayload {
  needTwoFactor: true;
  // short-lived ticket the client exchanges with the 2FA code
  twoFactorToken: string;
  accessToken?: undefined;
  refreshToken?: undefined;
  user?: undefined;
}

export type SignInResult = AuthPayload | NeedTwoFactorPayload;

export interface AuthDeps {
  users: UserRepository;
  profiles: ProfileRepository;
  refreshTokens: RefreshTokenRepository;
  emailTokens: EmailTokenRepository;
  mail: MailService;
  twoFactor: TwoFactorService;
  telegramTickets: TelegramTicketStore;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONE_HOUR = 60 * 60 * 1000;
const CODE_TTL = 15 * 60 * 1000; // email confirmation code valid for 15 min

export class AuthUseCases {
  constructor(private readonly deps: AuthDeps) {}

  /* ----------------------------- helpers ----------------------------- */

  private async issueTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = signAccessToken({ sub: userId, email });
    const refreshToken = signRefreshToken({ sub: userId });
    await this.deps.refreshTokens.save(
      userId,
      sha256(refreshToken),
      refreshTokenExpiryDate(),
    );
    return { accessToken, refreshToken };
  }

  /* ----------------------------- sign up ----------------------------- */

  async signUp(input: {
    email: string;
    password: string;
    name?: string;
    nickname?: string;
  }): Promise<AuthPayload> {
    const email = input.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) throw AppError.validation('Invalid email');
    if (!input.password || input.password.length < 8) {
      throw AppError.validation('Password must be at least 8 characters');
    }

    const existing = await this.deps.users.findByEmail(email);
    if (existing) throw AppError.emailTaken();

    const passwordHash = await hashPassword(input.password);
    const user = await this.deps.users.create({
      email,
      password: passwordHash,
      name: input.name,
      nickname: input.nickname,
      emailVerified: false,
    });

    // isVerified mirrors email confirmation status, stored on the profile.
    await this.deps.profiles.create({ userId: user.id, isVerified: false });

    // Email confirmation CODE (6 digits, stored hashed).
    await this.issueEmailCode(user.id, email);

    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /* --------------------------- confirm email -------------------------- */

  /** Generate a fresh 6-digit code, invalidate older ones, and email it. */
  private async issueEmailCode(userId: string, email: string): Promise<void> {
    await this.deps.emailTokens.invalidateForUser(userId, 'verify_email');
    const code = randomNumericCode(6);
    await this.deps.emailTokens.create(
      userId,
      sha256(code),
      'verify_email',
      new Date(Date.now() + CODE_TTL),
    );
    await this.deps.mail.sendEmailVerificationCode(email, code);
  }

  /** Confirm an email using the 6-digit code sent to that address. */
  async confirmEmailCode(email: string, code: string): Promise<boolean> {
    const normalized = email?.trim().toLowerCase();
    const user = await this.deps.users.findByEmail(normalized);
    if (!user) throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid code', 400);
    if (user.emailVerified) return true;

    const record = await this.deps.emailTokens.findValid(sha256(code), 'verify_email');
    if (!record || record.userId !== user.id) {
      throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired code', 400);
    }
    await this.deps.users.update(record.userId, { emailVerified: true });
    await this.deps.profiles.update(record.userId, { isVerified: true });
    await this.deps.emailTokens.markUsed(record.id);
    return true;
  }

  /** Resend a confirmation code to the user's email. */
  async resendEmailCode(email: string): Promise<boolean> {
    const normalized = email?.trim().toLowerCase();
    const user = await this.deps.users.findByEmail(normalized);
    // Don't leak which emails exist; silently succeed.
    if (!user || user.emailVerified) return true;
    await this.issueEmailCode(user.id, user.email);
    return true;
  }

  /* ----------------------------- sign in ----------------------------- */

  async signIn(input: { email: string; password: string }): Promise<SignInResult> {
    const email = input.email?.trim().toLowerCase();
    const user = await this.deps.users.findByEmail(email);
    if (!user || !user.password) throw AppError.invalidCredentials();

    const ok = await comparePassword(input.password, user.password);
    if (!ok) throw AppError.invalidCredentials();

    if (user.twoFactorEnabled) {
      // Issue a short-lived ticket scoped to the 2FA step only.
      const twoFactorToken = signAccessToken({ sub: user.id, email: user.email });
      return { needTwoFactor: true, twoFactorToken };
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  async signInTwoFactor(input: { userId: string; code: string }): Promise<AuthPayload> {
    const user = await this.deps.users.findById(input.userId);
    if (!user) throw AppError.unauthorized();
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(ErrorCodes.TWO_FACTOR_NOT_ENABLED, 'Two-factor is not enabled', 400);
    }
    const valid = this.deps.twoFactor.verify(user.twoFactorSecret, input.code);
    if (!valid) throw new AppError(ErrorCodes.INVALID_2FA_CODE, 'Invalid 2FA code', 401);

    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /* ----------------------------- refresh ----------------------------- */

  async refresh(refreshToken: string): Promise<AuthPayload> {
    const payload = verifyRefreshToken(refreshToken);
    const hash = sha256(refreshToken);
    const record = await this.deps.refreshTokens.findValidByHash(hash);
    if (!record) throw new AppError(ErrorCodes.INVALID_TOKEN, 'Refresh token revoked', 401);

    const user = await this.deps.users.findById(payload.sub);
    if (!user) throw AppError.unauthorized();

    // Rotation: revoke the used token, issue a fresh pair.
    await this.deps.refreshTokens.revokeByHash(hash);
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /* ----------------------------- logout ------------------------------ */

  async logout(refreshToken?: string): Promise<boolean> {
    if (refreshToken) {
      await this.deps.refreshTokens.revokeByHash(sha256(refreshToken));
    }
    return true;
  }

  /* ------------------------- password recovery ----------------------- */

  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.deps.users.findByEmail(email?.trim().toLowerCase());
    // Always return true to avoid leaking which emails are registered.
    if (!user) return true;

    await this.deps.emailTokens.invalidateForUser(user.id, 'reset_password');
    const rawToken = randomToken();
    await this.deps.emailTokens.create(
      user.id,
      sha256(rawToken),
      'reset_password',
      new Date(Date.now() + ONE_HOUR),
    );
    await this.deps.mail.sendPasswordReset(user.email, rawToken);
    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    if (!newPassword || newPassword.length < 8) {
      throw AppError.validation('Password must be at least 8 characters');
    }
    const record = await this.deps.emailTokens.findValid(sha256(token), 'reset_password');
    if (!record) throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired token', 400);

    const passwordHash = await hashPassword(newPassword);
    await this.deps.users.update(record.userId, { password: passwordHash });
    await this.deps.emailTokens.markUsed(record.id);
    // Invalidate all sessions after a password change.
    await this.deps.refreshTokens.revokeAllForUser(record.userId);
    return true;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.deps.users.findById(userId);
    if (!user || !user.password) throw AppError.unauthorized();
    const ok = await comparePassword(oldPassword, user.password);
    if (!ok) throw AppError.invalidCredentials('Current password is incorrect');
    if (!newPassword || newPassword.length < 8) {
      throw AppError.validation('Password must be at least 8 characters');
    }
    await this.deps.users.update(userId, { password: await hashPassword(newPassword) });
    await this.deps.refreshTokens.revokeAllForUser(userId);
    return true;
  }

  /* ------------------------------- 2FA ------------------------------- */

  async enableTwoFactor(userId: string): Promise<{ qrDataUrl: string; otpauthUrl: string }> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    if (user.twoFactorEnabled) {
      throw new AppError(
        ErrorCodes.TWO_FACTOR_ALREADY_ENABLED,
        'Two-factor is already enabled',
        400,
      );
    }
    const setup = await this.deps.twoFactor.generate(user.email);
    // Store secret but keep 2FA disabled until confirmed with a code.
    await this.deps.users.update(userId, { twoFactorSecret: setup.secret });
    return { qrDataUrl: setup.qrDataUrl, otpauthUrl: setup.otpauthUrl };
  }

  async confirmTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.deps.users.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new AppError(ErrorCodes.TWO_FACTOR_NOT_ENABLED, 'No pending 2FA setup', 400);
    }
    const valid = this.deps.twoFactor.verify(user.twoFactorSecret, code);
    if (!valid) throw new AppError(ErrorCodes.INVALID_2FA_CODE, 'Invalid 2FA code', 401);
    await this.deps.users.update(userId, { twoFactorEnabled: true });
    return true;
  }

  async disableTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.deps.users.findById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(ErrorCodes.TWO_FACTOR_NOT_ENABLED, 'Two-factor is not enabled', 400);
    }
    const valid = this.deps.twoFactor.verify(user.twoFactorSecret, code);
    if (!valid) throw new AppError(ErrorCodes.INVALID_2FA_CODE, 'Invalid 2FA code', 401);
    await this.deps.users.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    return true;
  }

  /* --------------------------- OAuth / external --------------------------- */

  /**
   * Find-or-create a user from a verified GitHub profile and issue tokens.
   * Links by githubId first, then by email; creates a passwordless user
   * otherwise. GitHub-verified emails mark the account as verified.
   */
  async loginWithGithub(profile: GithubProfileInput): Promise<AuthPayload> {
    let user = await this.deps.users.findByGithubId(profile.githubId);

    if (!user && profile.email) {
      const byEmail = await this.deps.users.findByEmail(profile.email.toLowerCase());
      if (byEmail) {
        user = await this.deps.users.update(byEmail.id, { githubId: profile.githubId });
      }
    }

    if (!user) {
      // email is required by the model; synthesize a stable placeholder if GitHub
      // did not expose one (the user can set a real email later in the profile).
      const email = (profile.email ?? `gh_${profile.githubId}@users.noreply.github.com`).toLowerCase();
      user = await this.deps.users.create({
        email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        githubId: profile.githubId,
        emailVerified: Boolean(profile.email && profile.emailVerified),
      });
      await this.deps.profiles.create({
        userId: user.id,
        isVerified: Boolean(profile.email && profile.emailVerified),
      });
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /**
   * Find-or-create a user from verified Telegram login data and issue tokens.
   * The signature MUST be validated by the caller before calling this.
   */
  async loginWithTelegram(data: TelegramProfileInput): Promise<AuthPayload> {
    let user = await this.deps.users.findByTelegramId(data.telegramId);

    if (!user) {
      const email = `tg_${data.telegramId}@telegram.local`;
      user = await this.deps.users.create({
        email,
        name: data.name,
        nickname: data.username,
        avatarUrl: data.avatarUrl,
        telegramId: data.telegramId,
        emailVerified: false,
      });
      await this.deps.profiles.create({ userId: user.id, isVerified: false });
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /* --------------------------- linking (authed) --------------------------- */

  /** Link a GitHub account to an already-authenticated user. */
  async linkGithub(userId: string, profile: GithubProfileInput): Promise<PublicUser> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    const owner = await this.deps.users.findByGithubId(profile.githubId);
    if (owner && owner.id !== userId) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        'This GitHub account is already linked to another user',
        409,
      );
    }
    const updated = await this.deps.users.update(userId, {
      githubId: profile.githubId,
      avatarUrl: user.avatarUrl ?? profile.avatarUrl,
    });
    return toPublicUser(updated);
  }

  /** Link a Telegram account to an already-authenticated user. */
  async linkTelegram(userId: string, data: TelegramProfileInput): Promise<PublicUser> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    const owner = await this.deps.users.findByTelegramId(data.telegramId);
    if (owner && owner.id !== userId) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        'This Telegram account is already linked to another user',
        409,
      );
    }
    const updated = await this.deps.users.update(userId, {
      telegramId: data.telegramId,
      avatarUrl: user.avatarUrl ?? data.avatarUrl,
    });
    return toPublicUser(updated);
  }

  /** Remove a linked provider. Refuses to leave a passwordless account with no way in. */
  async unlinkProvider(userId: string, provider: 'github' | 'telegram'): Promise<PublicUser> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    const hasPassword = Boolean(user.password);
    const otherProvider = provider === 'github' ? user.telegramId : user.githubId;
    if (!hasPassword && !otherProvider) {
      throw new AppError(
        ErrorCodes.VALIDATION,
        'Set a password before unlinking your only sign-in method',
        400,
      );
    }
    const patch =
      provider === 'github'
        ? ({ githubId: null } as const)
        : ({ telegramId: null } as const);
    const updated = await this.deps.users.update(userId, patch);
    return toPublicUser(updated);
  }

  /* ----------------------- OAuth handoff (cross-origin) -------------------- */

  /**
   * After a successful OAuth login the backend issues a one-time handoff token.
   * The frontend exchanges it here (through its own-origin proxy) so the
   * resulting session cookies are set on the FRONTEND origin.
   */
  async issueOAuthHandoff(userId: string): Promise<string> {
    return signOAuthToken(userId, 'oauth_handoff');
  }

  /** Mint a short-lived link token for an authenticated user starting a link flow. */
  async issueOAuthLinkToken(userId: string): Promise<string> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    return signOAuthToken(userId, 'oauth_link');
  }

  async exchangeOAuthHandoff(handoffToken: string): Promise<AuthPayload> {
    const { sub } = verifyOAuthToken(handoffToken, 'oauth_handoff');
    const user = await this.deps.users.findById(sub);
    if (!user) throw AppError.unauthorized();
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toPublicUser(user) };
  }

  /* ----------------------- Telegram bot deep-link flow -------------------- */

  /**
   * Begin a Telegram bot login: create a ticket and return the deep-link the
   * frontend opens (https://t.me/<bot>?start=<ticket>). If `linkUserId` is set,
   * a successful tap links Telegram to that authenticated user.
   */
  startTelegramBotLogin(linkUserId?: string): { token: string; botUrl: string } {
    const ticket = this.deps.telegramTickets.create(linkUserId);
    const base = (process.env.TELEGRAM_BOT_URL ?? '').replace(/\/$/, '');
    const botUrl = base ? `${base}?start=${ticket.token}` : '';
    return { token: ticket.token, botUrl };
  }

  /**
   * Poll a Telegram ticket. Returns status; when 'done' it either logs the user
   * in (returns AuthPayload) or, for a link flow, attaches Telegram and returns
   * { linked: true }.
   */
  async pollTelegramBotLogin(
    token: string,
  ): Promise<
    | { status: 'pending' }
    | { status: 'expired' }
    | { status: 'done'; auth: AuthPayload }
    | { status: 'linked' }
  > {
    const ticket = this.deps.telegramTickets.get(token);
    if (!ticket) return { status: 'expired' };
    if (ticket.status === 'expired') return { status: 'expired' };
    if (ticket.status === 'pending' || !ticket.user) return { status: 'pending' };

    const verified = ticket.user;
    this.deps.telegramTickets.consume(token);

    // Link flow: attach to the authenticated user.
    if (ticket.linkUserId) {
      await this.linkTelegram(ticket.linkUserId, {
        telegramId: verified.telegramId,
        name: verified.name,
        username: verified.username,
      });
      return { status: 'linked' };
    }

    // Login flow: find-or-create and issue tokens.
    const auth = await this.loginWithTelegram({
      telegramId: verified.telegramId,
      name: verified.name,
      username: verified.username,
    });
    return { status: 'done', auth };
  }
}

export interface GithubProfileInput {
  githubId: string;
  email: string | null;
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

export interface TelegramProfileInput {
  telegramId: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}
