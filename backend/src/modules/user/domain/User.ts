/**
 * Domain entity. Plain data shape, independent of Mongoose/Sequelize/SQLite.
 * `id` is a string here so the same contract works across Mongo (ObjectId)
 * and SQL (numeric ids serialized to string).
 */
export interface User {
  id: string;
  name?: string;
  email: string;
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

  createdAt: Date;
  updatedAt: Date;
}

/** User shape that is safe to return to clients (no secrets). */
export type PublicUser = Omit<User, 'password' | 'twoFactorSecret'>;

export function toPublicUser(user: User): PublicUser {
  const { password, twoFactorSecret, ...rest } = user;
  void password;
  void twoFactorSecret;
  return rest;
}
