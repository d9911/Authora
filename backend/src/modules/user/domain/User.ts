export type EmailKind = 'contactable' | 'synthetic';
export type RecoveryMethod = 'email' | 'telegram';

export function inferEmailKind(email: string): EmailKind {
  const normalized = email.toLowerCase();
  if (/^tg_[^@]+@telegram\.local$/.test(normalized)) return 'synthetic';
  if (/^gh_[^@]+@users\.noreply\.github\.com$/.test(normalized)) return 'synthetic';
  return 'contactable';
}

/**
 * Domain entity. Plain data shape, independent of Mongoose/Sequelize/SQLite.
 * `id` is a string here so the same contract works across Mongo (ObjectId)
 * and SQL (numeric ids serialized to string).
 */
export interface User {
  id: string;
  name?: string;
  email: string;
  emailKind: EmailKind;
  password?: string; // bcrypt hash; absent for pure OAuth users
  nickname?: string;
  phoneNumber?: string;
  telegramId?: string;
  avatarUrl?: string;

  // auth/security state
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string; // base32 secret, never exposed via API
  githubId?: string;
  authVersion: number;

  createdAt: Date;
  updatedAt: Date;
}

/** User shape that is safe to return to clients (no secrets or synthetic email). */
export type PublicUser = Omit<User, 'password' | 'twoFactorSecret' | 'email'> & {
  email: string | null;
  hasPassword: boolean;
  recoveryMethods: RecoveryMethod[];
};

export function toPublicUser(user: User): PublicUser {
  const { password, twoFactorSecret, ...rest } = user;
  void twoFactorSecret;
  const recoveryMethods: RecoveryMethod[] = [];
  if (user.emailKind === 'contactable') recoveryMethods.push('email');
  if (user.telegramId) recoveryMethods.push('telegram');
  return {
    ...rest,
    email: user.emailKind === 'contactable' ? user.email : null,
    hasPassword: Boolean(password),
    recoveryMethods,
  };
}
