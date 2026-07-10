import { AppError, ErrorCodes } from '../../../core/errors/AppError';
import { comparePassword, hashPassword, randomNumericCode, randomToken, sha256 } from '../../../infrastructure/jwt/hash';
import { ProfileRepository } from '../../profile/domain/ProfileRepository';
import { UserRepository } from '../../user/domain/UserRepository';
import { User } from '../../user/domain/User';
import { EmailTokenRepository } from '../domain/EmailTokenRepository';
import { MailGateway } from '../domain/MailGateway';
import {
  RecoveryChannel,
  RecoveryGrantRepository,
} from '../domain/RecoveryGrantRepository';
import { RefreshTokenRepository } from '../domain/RefreshTokenRepository';
import { PASSWORD_POLICY_HINT, validatePassword } from '../domain/passwordPolicy';
import { AuthAuditGateway, AuthAuditEvent } from '../domain/AuthAuditGateway';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_LINK_TTL_MS = 60 * 60 * 1000;
const RECOVERY_GRANT_TTL_MS = 15 * 60 * 1000;
const EMAIL_CHANGE_CODE_TTL_MS = 15 * 60 * 1000;

export interface PasswordUseCaseDeps {
  users: UserRepository;
  profiles: ProfileRepository;
  refreshTokens: RefreshTokenRepository;
  emailTokens: EmailTokenRepository;
  recoveryGrants: RecoveryGrantRepository;
  mail: MailGateway;
  audit?: AuthAuditGateway;
  now?: () => Date;
}

export interface RecoveryGrantPayload {
  recoveryToken: string;
  channel: RecoveryChannel;
  expiresAt: Date;
}

export interface PasswordResetCompletion {
  user: User;
  channel: RecoveryChannel;
}

export class PasswordUseCases {
  private readonly now: () => Date;

  constructor(private readonly deps: PasswordUseCaseDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async requestPasswordReset(emailInput: string, nextPath?: string): Promise<boolean> {
    this.audit('recovery_requested', { channel: 'email', outcome: 'accepted' });
    const email = emailInput?.trim().toLowerCase();
    const user = email ? await this.deps.users.findByEmail(email) : null;

    // The public response is intentionally identical for missing accounts and
    // accounts without a deliverable email address.
    if (!user || user.emailKind !== 'contactable') return true;

    await this.deps.emailTokens.invalidateForUser(user.id, 'reset_password');
    const rawToken = randomToken();
    await this.deps.emailTokens.create(
      user.id,
      sha256(rawToken),
      'reset_password',
      new Date(this.now().getTime() + RESET_LINK_TTL_MS),
    );

    try {
      await this.deps.mail.sendPasswordReset(user.email, rawToken, safeNextPath(nextPath));
    } catch (error) {
      this.audit('recovery_delivery_failed', { channel: 'email', reason: 'provider_error' });
      // Do not turn a provider failure into account-enumeration evidence.
      console.error(
        '[account-recovery] password reset delivery failed',
        error instanceof Error ? error.message : 'unknown mail error',
      );
    }
    return true;
  }

  async exchangePasswordResetToken(token: string): Promise<RecoveryGrantPayload> {
    const record = await this.deps.emailTokens.consumeValid(
      sha256(token ?? ''),
      'reset_password',
    );
    if (!record) throw this.invalidRecoveryToken();
    const grant = await this.issueRecoveryGrant(record.userId, 'email');
    this.audit('recovery_token_exchanged', { channel: 'email', userId: record.userId });
    return grant;
  }

  async issueRecoveryGrant(
    userId: string,
    channel: RecoveryChannel,
  ): Promise<RecoveryGrantPayload> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw this.invalidRecoveryToken();
    if (channel === 'email' && user.emailKind !== 'contactable') {
      throw new AppError(
        ErrorCodes.RECOVERY_NOT_AVAILABLE,
        'Email recovery is not available for this account',
        400,
      );
    }
    if (channel === 'telegram' && !user.telegramId) {
      throw new AppError(
        ErrorCodes.RECOVERY_NOT_AVAILABLE,
        'Telegram recovery is not available for this account',
        400,
      );
    }

    await this.deps.recoveryGrants.invalidateForUser(user.id);
    const recoveryToken = randomToken();
    const expiresAt = new Date(this.now().getTime() + RECOVERY_GRANT_TTL_MS);
    await this.deps.recoveryGrants.create(
      user.id,
      sha256(recoveryToken),
      channel,
      user.authVersion,
      expiresAt,
    );
    return { recoveryToken, channel, expiresAt };
  }

  async completePasswordReset(
    recoveryToken: string,
    newPassword: string,
  ): Promise<PasswordResetCompletion> {
    if (!validatePassword(newPassword)) throw AppError.validation(PASSWORD_POLICY_HINT);

    const grant = await this.deps.recoveryGrants.consumeValid(sha256(recoveryToken ?? ''));
    if (!grant) throw this.invalidRecoveryToken();

    const user = await this.deps.users.findById(grant.userId);
    if (!user || user.authVersion !== grant.authVersion) throw this.invalidRecoveryToken();

    const passwordHash = await hashPassword(newPassword);
    const verifyEmail = grant.channel === 'email' ? true : undefined;
    const updated = await this.deps.users.updatePasswordAndIncrementAuthVersion(
      user.id,
      passwordHash,
      verifyEmail,
    );
    if (verifyEmail) {
      const profile = await this.deps.profiles.findByUserId(user.id);
      if (profile && !profile.isVerified) await this.deps.profiles.update(user.id, { isVerified: true });
    }

    await Promise.all([
      this.deps.refreshTokens.revokeAllForUser(user.id),
      this.deps.recoveryGrants.invalidateForUser(user.id),
    ]);

    if (updated.emailKind === 'contactable') {
      try {
        await this.deps.mail.sendPasswordChanged(updated.email);
      } catch (error) {
        console.error(
          '[account-recovery] password changed notification failed',
          error instanceof Error ? error.message : 'unknown mail error',
        );
      }
    }
    this.audit('password_reset_completed', {
      channel: grant.channel,
      userId: updated.id,
      outcome: 'success',
    });
    return { user: updated, channel: grant.channel };
  }

  /** Compatibility path for existing GraphQL clients. */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const grant = await this.exchangePasswordResetToken(token);
    await this.completePasswordReset(grant.recoveryToken, newPassword);
    return true;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.deps.users.findById(userId);
    if (!user || !user.password) throw AppError.unauthorized();
    const matches = await comparePassword(oldPassword, user.password);
    if (!matches) throw AppError.invalidCredentials('Current password is incorrect');
    if (!validatePassword(newPassword)) throw AppError.validation(PASSWORD_POLICY_HINT);

    await this.deps.users.updatePasswordAndIncrementAuthVersion(
      user.id,
      await hashPassword(newPassword),
    );
    await Promise.all([
      this.deps.refreshTokens.revokeAllForUser(user.id),
      this.deps.recoveryGrants.invalidateForUser(user.id),
    ]);
    return true;
  }

  async requestEmailChange(userId: string, emailInput: string): Promise<boolean> {
    const email = emailInput?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) throw AppError.validation('Invalid email');
    const owner = await this.deps.users.findByEmail(email);
    if (owner && owner.id !== userId) throw AppError.emailTaken();

    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    await this.deps.emailTokens.invalidateForUser(user.id, 'change_email');
    const code = randomNumericCode(6);
    await this.deps.emailTokens.create(
      user.id,
      sha256(code),
      'change_email',
      new Date(this.now().getTime() + EMAIL_CHANGE_CODE_TTL_MS),
      email,
    );
    await this.deps.mail.sendEmailVerificationCode(email, code);
    this.audit('email_change_requested', { channel: 'email', userId });
    return true;
  }

  async confirmEmailChange(userId: string, code: string): Promise<boolean> {
    const record = await this.deps.emailTokens.consumeValid(
      sha256(code ?? ''),
      'change_email',
      userId,
    );
    if (!record?.targetEmail) {
      throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired code', 400);
    }
    const owner = await this.deps.users.findByEmail(record.targetEmail);
    if (owner && owner.id !== userId) throw AppError.emailTaken();

    await this.deps.users.update(userId, {
      email: record.targetEmail,
      emailKind: 'contactable',
      emailVerified: true,
    });
    const profile = await this.deps.profiles.findByUserId(userId);
    if (profile && !profile.isVerified) await this.deps.profiles.update(userId, { isVerified: true });
    this.audit('email_change_confirmed', { channel: 'email', userId });
    return true;
  }

  private audit(
    event: AuthAuditEvent,
    details?: Record<string, string | number | boolean | undefined>,
  ): void {
    this.deps.audit?.record(event, details);
  }

  private invalidRecoveryToken(): AppError {
    return new AppError(
      ErrorCodes.RECOVERY_TOKEN_INVALID,
      'Recovery link is invalid, expired, or already used',
      400,
    );
  }
}

function safeNextPath(value?: string): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  try {
    const url = new URL(value, 'http://authora.local');
    if (url.origin !== 'http://authora.local') return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}
