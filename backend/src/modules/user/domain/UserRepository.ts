import { User } from './User';

export interface CreateUserDto {
  email: string;
  password?: string;
  name?: string;
  nickname?: string;
  phoneNumber?: string;
  telegramId?: string;
  avatarUrl?: string;
  githubId?: string;
  emailVerified?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  nickname?: string;
  phoneNumber?: string;
  telegramId?: string;
  avatarUrl?: string;
  password?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  githubId?: string;
}

/**
 * Persistence-agnostic contract. Use cases depend on this interface only,
 * so swapping Mongo -> Postgres -> SQLite does not touch business logic.
 */
export interface UserRepository {
  create(data: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGithubId(githubId: string): Promise<User | null>;
  findByTelegramId(telegramId: string): Promise<User | null>;
  update(id: string, data: UpdateUserDto): Promise<User>;
}
