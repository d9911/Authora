/// <reference types="node" />

import assert from 'node:assert/strict';
import { Profile } from '../src/modules/profile/domain/Profile';
import { ProfileRepository, UpdateProfileDto } from '../src/modules/profile/domain/ProfileRepository';
import { ProfileImage, ProfileImageKind } from '../src/modules/profile-photo/domain/ProfileImage';
import { ProfileImageRepository } from '../src/modules/profile-photo/domain/ProfileImageRepository';
import { ProfilePhotoUseCases } from '../src/modules/profile-photo/use-cases/ProfilePhotoUseCases';
import { User } from '../src/modules/user/domain/User';
import { UpdateUserDto, UserRepository } from '../src/modules/user/domain/UserRepository';

class FakeUsers implements UserRepository {
  user: User = {
    id: 'user-1',
    email: 'user@example.com',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  async create(): Promise<User> {
    throw new Error('not needed');
  }

  async findById(id: string): Promise<User | null> {
    return id === this.user.id ? this.user : null;
  }

  async findByEmail(): Promise<User | null> {
    return null;
  }

  async findByGithubId(): Promise<User | null> {
    return null;
  }

  async findByTelegramId(): Promise<User | null> {
    return null;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    assert.equal(id, this.user.id);
    this.user = {
      ...this.user,
      name: data.name !== undefined ? data.name : this.user.name,
      nickname: data.nickname !== undefined ? data.nickname : this.user.nickname,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : this.user.phoneNumber,
      avatarUrl: data.avatarUrl === null ? undefined : data.avatarUrl ?? this.user.avatarUrl,
      password: data.password !== undefined ? data.password : this.user.password,
      emailVerified:
        data.emailVerified !== undefined ? data.emailVerified : this.user.emailVerified,
      twoFactorEnabled:
        data.twoFactorEnabled !== undefined ? data.twoFactorEnabled : this.user.twoFactorEnabled,
      twoFactorSecret:
        data.twoFactorSecret === null ? undefined : data.twoFactorSecret ?? this.user.twoFactorSecret,
      githubId: data.githubId === null ? undefined : data.githubId ?? this.user.githubId,
      telegramId: data.telegramId === null ? undefined : data.telegramId ?? this.user.telegramId,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    return this.user;
  }
}

class FakeProfiles implements ProfileRepository {
  profile: Profile = {
    id: 'profile-1',
    userId: 'user-1',
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  async create(): Promise<Profile> {
    throw new Error('not needed');
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    return userId === this.profile.userId ? this.profile : null;
  }

  async update(userId: string, data: UpdateProfileDto): Promise<Profile> {
    assert.equal(userId, this.profile.userId);
    this.profile = {
      ...this.profile,
      ...data,
      coverSrc: data.coverSrc === null ? undefined : data.coverSrc ?? this.profile.coverSrc,
      cityId: data.cityId === null ? undefined : data.cityId ?? this.profile.cityId,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    return this.profile;
  }
}

class FakeImages implements ProfileImageRepository {
  records = new Map<string, ProfileImage>();

  async findByUserAndKind(userId: string, kind: ProfileImageKind): Promise<ProfileImage | null> {
    return this.records.get(`${userId}:${kind}`) ?? null;
  }

  async upsert(
    userId: string,
    kind: ProfileImageKind,
    image: Omit<ProfileImage, 'id' | 'userId' | 'kind' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProfileImage> {
    const key = `${userId}:${kind}`;
    const existing = this.records.get(key);
    const now = new Date('2026-01-02T00:00:00.000Z');
    const record: ProfileImage = {
      id: existing?.id ?? `${kind}-1`,
      userId,
      kind,
      ...image,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.records.set(key, record);
    return record;
  }

  async delete(userId: string, kind: ProfileImageKind): Promise<void> {
    this.records.delete(`${userId}:${kind}`);
  }
}

class FakeProcessor {
  version = 0;

  async process(input: { kind: ProfileImageKind }) {
    this.version += 1;
    return {
      data: Buffer.from(`image-${input.kind}-${this.version}`),
      contentType: 'image/webp',
      sizeBytes: 10 + this.version,
      width: input.kind === 'avatar' ? 512 : 1920,
      height: input.kind === 'avatar' ? 512 : 640,
      etag: `${input.kind}-etag-${this.version}`,
    };
  }
}

async function run() {
  const users = new FakeUsers();
  const profiles = new FakeProfiles();
  const images = new FakeImages();
  const processor = new FakeProcessor();
  const useCases = new ProfilePhotoUseCases({
    users,
    profiles,
    profileImages: images,
    processor,
  });

  const firstAvatar = await useCases.upload('user-1', {
    kind: 'avatar',
    dataBase64: Buffer.from('input').toString('base64'),
    mimeType: 'image/png',
  });
  assert.equal(firstAvatar.user.avatarUrl, '/api/profile-images/user-1/avatar?v=avatar-etag-1');
  assert.equal(firstAvatar.profile.coverSrc, undefined);
  assert.ok(firstAvatar.image);
  assert.equal(firstAvatar.image.width, 512);
  assert.equal(images.records.size, 1);

  const secondAvatar = await useCases.upload('user-1', {
    kind: 'avatar',
    dataBase64: Buffer.from('replacement').toString('base64'),
    mimeType: 'image/png',
  });
  assert.equal(secondAvatar.user.avatarUrl, '/api/profile-images/user-1/avatar?v=avatar-etag-2');
  assert.equal(images.records.size, 1, 'avatar upload replaces the one existing avatar record');

  const cover = await useCases.upload('user-1', {
    kind: 'cover',
    dataBase64: Buffer.from('cover').toString('base64'),
    mimeType: 'image/jpeg',
  });
  assert.equal(cover.profile.coverSrc, '/api/profile-images/user-1/cover?v=cover-etag-3');
  assert.ok(cover.image);
  assert.equal(cover.image.height, 640);
  assert.equal(images.records.size, 2);

  const afterAvatarDelete = await useCases.delete('user-1', 'avatar');
  assert.equal(afterAvatarDelete.user.avatarUrl, undefined);
  assert.equal(images.records.has('user-1:avatar'), false);
  assert.equal(images.records.has('user-1:cover'), true);

  const afterCoverDelete = await useCases.delete('user-1', 'cover');
  assert.equal(afterCoverDelete.profile.coverSrc, undefined);
  assert.equal(images.records.size, 0);

  await assert.rejects(
    () =>
      useCases.upload('user-1', {
        kind: 'avatar',
        dataBase64: 'not valid base64',
        mimeType: 'image/png',
      }),
    /Invalid image payload/,
  );
}

run()
  .then(() => {
    console.log('profile-photo-use-cases tests passed');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
