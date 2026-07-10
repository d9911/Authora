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
          emailKind, emailVerified, twoFactorEnabled, githubId, authVersion, createdAt, updatedAt)
         VALUES (@name, @email, @password, @nickname, @phoneNumber, @telegramId, @avatarUrl,
                 @emailKind, @emailVerified, 0, @githubId, @authVersion, @createdAt, @updatedAt)`,
      )
      .run({
        name: data.name ?? null,
        email: data.email.toLowerCase(),
        emailKind: data.emailKind ?? 'contactable',
        password: data.password ?? null,
        nickname: data.nickname ?? null,
        phoneNumber: data.phoneNumber ?? null,
        telegramId: data.telegramId ?? null,
        avatarUrl: data.avatarUrl ?? null,
        emailVerified: data.emailVerified ? 1 : 0,
        githubId: data.githubId ?? null,
        authVersion: data.authVersion ?? 0,
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
    if (data.email !== undefined) assign('email', data.email.toLowerCase());
    if (data.emailKind !== undefined) assign('emailKind', data.emailKind);
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
    if (data.twoFactorRecoveryCodeHashes !== undefined) {
      assign(
        'twoFactorRecoveryCodeHashes',
        data.twoFactorRecoveryCodeHashes === null
          ? null
          : JSON.stringify(data.twoFactorRecoveryCodeHashes),
      );
    }
    if (data.githubId !== undefined) assign('githubId', data.githubId);
    if (data.authVersion !== undefined) assign('authVersion', data.authVersion);

    fields.push('updatedAt = @updatedAt');
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(params);

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User not found: ${id}`);
    return updated;
  }

  async updatePasswordAndIncrementAuthVersion(
    id: string,
    password: string,
    emailVerified?: boolean,
  ): Promise<User> {
    const db = getSqlite();
    const params = {
      id: Number(id),
      password,
      emailVerified: emailVerified === undefined ? null : emailVerified ? 1 : 0,
      updatedAt: nowIso(),
    };
    db.prepare(
      `UPDATE users
       SET password = @password,
           authVersion = authVersion + 1,
           emailVerified = CASE
             WHEN @emailVerified IS NULL THEN emailVerified
             ELSE @emailVerified
           END,
           updatedAt = @updatedAt
       WHERE id = @id`,
    ).run(params);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`User not found: ${id}`);
    return updated;
  }

  async consumeTwoFactorRecoveryCode(id: string, codeHash: string): Promise<boolean> {
    const db = getSqlite();
    const consume = db.transaction(() => {
      const row = db
        .prepare('SELECT twoFactorRecoveryCodeHashes FROM users WHERE id = ?')
        .get(Number(id)) as { twoFactorRecoveryCodeHashes?: string | null } | undefined;
      const hashes = row?.twoFactorRecoveryCodeHashes
        ? (JSON.parse(row.twoFactorRecoveryCodeHashes) as string[])
        : [];
      if (!hashes.includes(codeHash)) return false;
      const remaining = hashes.filter((hash) => hash !== codeHash);
      const result = db
        .prepare(
          `UPDATE users SET twoFactorRecoveryCodeHashes = ?, updatedAt = ?
           WHERE id = ? AND twoFactorRecoveryCodeHashes = ?`,
        )
        .run(
          remaining.length ? JSON.stringify(remaining) : null,
          nowIso(),
          Number(id),
          row?.twoFactorRecoveryCodeHashes,
        );
      return result.changes === 1;
    });
    return consume();
  }
}
