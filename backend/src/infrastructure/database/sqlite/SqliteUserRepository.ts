import { User } from '../../../modules/user/domain/User';
import {
  CreateUserDto,
  UpdateUserDto,
  UserRepository,
} from '../../../modules/user/domain/UserRepository';
import { getSqlite } from './connection';
import { mapUser, nowIso } from './mappers';

export class SqliteUserRepository implements UserRepository {
  async create(data: CreateUserDto): Promise<User> {
    const db = getSqlite();
    const now = nowIso();
    const info = db
      .prepare(
        `INSERT INTO users
         (name, email, password, nickname, phoneNumber, telegramId, avatarUrl,
          emailVerified, twoFactorEnabled, githubId, createdAt, updatedAt)
         VALUES (@name, @email, @password, @nickname, @phoneNumber, @telegramId, @avatarUrl,
                 @emailVerified, 0, @githubId, @createdAt, @updatedAt)`,
      )
      .run({
        name: data.name ?? null,
        email: data.email.toLowerCase(),
        password: data.password ?? null,
        nickname: data.nickname ?? null,
        phoneNumber: data.phoneNumber ?? null,
        telegramId: data.telegramId ?? null,
        avatarUrl: data.avatarUrl ?? null,
        emailVerified: data.emailVerified ? 1 : 0,
        githubId: data.githubId ?? null,
        createdAt: now,
        updatedAt: now,
      });
    return (await this.findById(String(info.lastInsertRowid)))!;
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    const row = getSqlite().prepare('SELECT * FROM users WHERE id = ?').get(Number(id));
    return row ? mapUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = getSqlite()
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase());
    return row ? mapUser(row) : null;
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    const row = getSqlite().prepare('SELECT * FROM users WHERE githubId = ?').get(githubId);
    return row ? mapUser(row) : null;
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const row = getSqlite().prepare('SELECT * FROM users WHERE telegramId = ?').get(telegramId);
    return row ? mapUser(row) : null;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const db = getSqlite();
    const fields: string[] = [];
    const params: Record<string, unknown> = { id: Number(id), updatedAt: nowIso() };

    const assign = (col: string, value: unknown) => {
      fields.push(`${col} = @${col}`);
      params[col] = value;
    };

    if (data.name !== undefined) assign('name', data.name);
    if (data.nickname !== undefined) assign('nickname', data.nickname);
    if (data.phoneNumber !== undefined) assign('phoneNumber', data.phoneNumber);
    if (data.telegramId !== undefined) assign('telegramId', data.telegramId);
    if (data.avatarUrl !== undefined) assign('avatarUrl', data.avatarUrl);
    if (data.password !== undefined) assign('password', data.password);
    if (data.emailVerified !== undefined) assign('emailVerified', data.emailVerified ? 1 : 0);
    if (data.twoFactorEnabled !== undefined)
      assign('twoFactorEnabled', data.twoFactorEnabled ? 1 : 0);
    if (data.twoFactorSecret !== undefined)
      assign('twoFactorSecret', data.twoFactorSecret === null ? null : data.twoFactorSecret);
    if (data.githubId !== undefined) assign('githubId', data.githubId);

    fields.push('updatedAt = @updatedAt');
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(params);

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User not found: ${id}`);
    return updated;
  }
}
