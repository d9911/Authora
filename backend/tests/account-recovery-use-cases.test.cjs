const assert = require('node:assert/strict');
const { comparePassword, hashPassword, sha256 } = require('../dist/infrastructure/jwt/hash.js');
const { PasswordUseCases } = require('../dist/modules/auth/use-cases/PasswordUseCases.js');

const now = new Date('2026-07-10T12:00:00.000Z');

class FakeUsers {
  constructor() {
    this.users = new Map();
  }

  async create() {
    throw new Error('not needed');
  }

  async findById(id) {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email) {
    const normalized = email.toLowerCase();
    return [...this.users.values()].find((user) => user.email.toLowerCase() === normalized) ?? null;
  }

  async findByGithubId() {
    return null;
  }

  async findByTelegramId(telegramId) {
    return [...this.users.values()].find((user) => user.telegramId === telegramId) ?? null;
  }

  async update(id, patch) {
    const user = this.users.get(id);
    if (!user) throw new Error('user not found');
    const updated = { ...user, ...patch, updatedAt: now };
    this.users.set(id, updated);
    return updated;
  }

  async updatePasswordAndIncrementAuthVersion(id, password, emailVerified) {
    const user = this.users.get(id);
    if (!user) throw new Error('user not found');
    const updated = {
      ...user,
      password,
      authVersion: user.authVersion + 1,
      emailVerified: emailVerified ?? user.emailVerified,
      updatedAt: now,
    };
    this.users.set(id, updated);
    return updated;
  }
}

class FakeProfiles {
  constructor() {
    this.profiles = new Map();
  }

  async create() {
    throw new Error('not needed');
  }

  async findByUserId(userId) {
    return this.profiles.get(userId) ?? null;
  }

  async update(userId, patch) {
    const profile = this.profiles.get(userId);
    if (!profile) throw new Error('profile not found');
    const updated = { ...profile, ...patch, updatedAt: now };
    this.profiles.set(userId, updated);
    return updated;
  }
}

class FakeRefreshTokens {
  constructor() {
    this.revokedUsers = [];
  }

  async save() {}
  async findValidByHash() {
    return null;
  }
  async revokeByHash() {}
  async revokeAllForUser(userId) {
    this.revokedUsers.push(userId);
  }
}

class FakeEmailTokens {
  constructor() {
    this.records = new Map();
    this.sequence = 0;
  }

  async create(userId, tokenHash, type, expiresAt, targetEmail) {
    this.sequence += 1;
    this.records.set(String(this.sequence), {
      id: String(this.sequence),
      userId,
      tokenHash,
      type,
      expiresAt,
      targetEmail,
    });
  }

  async findValid(tokenHash, type, userId) {
    return (
      [...this.records.values()].find(
        (record) =>
          record.tokenHash === tokenHash &&
          record.type === type &&
          !record.usedAt &&
          record.expiresAt > now &&
          (!userId || record.userId === userId),
      ) ?? null
    );
  }

  async consumeValid(tokenHash, type, userId) {
    const record = await this.findValid(tokenHash, type, userId);
    if (!record) return null;
    record.usedAt = now;
    return record;
  }

  async markUsed(id) {
    const record = this.records.get(id);
    if (record) record.usedAt = now;
  }

  async invalidateForUser(userId, type) {
    for (const record of this.records.values()) {
      if (record.userId === userId && record.type === type && !record.usedAt) record.usedAt = now;
    }
  }
}

class FakeRecoveryGrants {
  constructor() {
    this.records = new Map();
    this.sequence = 0;
  }

  async create(userId, tokenHash, channel, authVersion, expiresAt) {
    this.sequence += 1;
    this.records.set(String(this.sequence), {
      id: String(this.sequence),
      userId,
      tokenHash,
      channel,
      authVersion,
      expiresAt,
    });
  }

  async consumeValid(tokenHash) {
    const record = [...this.records.values()].find(
      (candidate) =>
        candidate.tokenHash === tokenHash && !candidate.usedAt && candidate.expiresAt > now,
    );
    if (!record) return null;
    record.usedAt = now;
    return record;
  }

  async invalidateForUser(userId) {
    for (const record of this.records.values()) {
      if (record.userId === userId && !record.usedAt) record.usedAt = now;
    }
  }
}

class FakeMail {
  constructor() {
    this.resets = [];
    this.verificationCodes = [];
    this.passwordChanged = [];
  }

  async sendPasswordReset(to, token) {
    this.resets.push({ to, token });
  }

  async sendEmailVerificationCode(to, code) {
    this.verificationCodes.push({ to, code });
  }

  async sendPasswordChanged(to) {
    this.passwordChanged.push(to);
  }
}

async function run() {
  const users = new FakeUsers();
  const profiles = new FakeProfiles();
  const refreshTokens = new FakeRefreshTokens();
  const emailTokens = new FakeEmailTokens();
  const recoveryGrants = new FakeRecoveryGrants();
  const mail = new FakeMail();

  users.users.set('user-1', {
    id: 'user-1',
    email: 'user@example.com',
    emailKind: 'contactable',
    password: await hashPassword('OldPassword1!'),
    telegramId: 'telegram-1',
    emailVerified: true,
    twoFactorEnabled: false,
    authVersion: 0,
    createdAt: now,
    updatedAt: now,
  });
  profiles.profiles.set('user-1', {
    id: 'profile-1',
    userId: 'user-1',
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  users.users.set('telegram-only', {
    id: 'telegram-only',
    email: 'tg_999@telegram.local',
    emailKind: 'synthetic',
    telegramId: '999',
    emailVerified: false,
    twoFactorEnabled: false,
    authVersion: 0,
    createdAt: now,
    updatedAt: now,
  });

  const passwords = new PasswordUseCases({
    users,
    profiles,
    refreshTokens,
    emailTokens,
    recoveryGrants,
    mail,
    now: () => now,
  });

  assert.equal(await passwords.requestPasswordReset('USER@example.com'), true);
  assert.equal(mail.resets.length, 1);
  assert.equal(mail.resets[0].to, 'user@example.com');

  const exchange = await passwords.exchangePasswordResetToken(mail.resets[0].token);
  assert.equal(exchange.channel, 'email');
  assert.ok(exchange.recoveryToken.length >= 32);

  assert.equal(await passwords.completePasswordReset(exchange.recoveryToken, 'NewPassword1!'), true);
  const updated = users.users.get('user-1');
  assert.equal(await comparePassword('NewPassword1!', updated.password), true);
  assert.equal(updated.authVersion, 1);
  assert.deepEqual(refreshTokens.revokedUsers, ['user-1']);
  assert.deepEqual(mail.passwordChanged, ['user@example.com']);

  await assert.rejects(
    () => passwords.completePasswordReset(exchange.recoveryToken, 'AnotherPassword1!'),
    (error) => error.code === 'RECOVERY_TOKEN_INVALID',
  );

  assert.equal(await passwords.requestPasswordReset('tg_999@telegram.local'), true);
  assert.equal(mail.resets.length, 1, 'synthetic Telegram email must never receive reset mail');

  const telegramGrant = await passwords.issueRecoveryGrant('telegram-only', 'telegram');
  assert.equal(telegramGrant.channel, 'telegram');
  assert.equal(
    [...recoveryGrants.records.values()].some(
      (record) => record.tokenHash === sha256(telegramGrant.recoveryToken),
    ),
    true,
  );
}

run()
  .then(() => console.log('account-recovery-use-cases tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
