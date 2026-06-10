import { Profile } from '../../../modules/profile/domain/Profile';
import {
  CreateProfileDto,
  ProfileRepository,
  UpdateProfileDto,
} from '../../../modules/profile/domain/ProfileRepository';
import { getSqlite } from './connection';
import { mapProfile, nowIso } from './mappers';

export class SqliteProfileRepository implements ProfileRepository {
  async create(data: CreateProfileDto): Promise<Profile> {
    const db = getSqlite();
    const now = nowIso();
    db.prepare(
      `INSERT INTO profiles
       (userId, bio, isVerified, description, coverSrc, cityId, dateOfBirth,
        gender, address, timezone, createdAt, updatedAt)
       VALUES (@userId, @bio, @isVerified, @description, @coverSrc, @cityId, @dateOfBirth,
               @gender, @address, @timezone, @createdAt, @updatedAt)`,
    ).run({
      userId: Number(data.userId),
      bio: data.bio ?? null,
      isVerified: data.isVerified ? 1 : 0,
      description: data.description ?? null,
      coverSrc: data.coverSrc ?? null,
      cityId: data.cityId ? Number(data.cityId) : null,
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString() : null,
      gender: data.gender ?? null,
      address: data.address ?? null,
      timezone: data.timezone ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return (await this.findByUserId(data.userId))!;
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const row = getSqlite().prepare('SELECT * FROM profiles WHERE userId = ?').get(Number(userId));
    return row ? mapProfile(row) : null;
  }

  async update(userId: string, data: UpdateProfileDto): Promise<Profile> {
    const db = getSqlite();
    const existing = await this.findByUserId(userId);

    // Upsert semantics to match the Mongo repository.
    if (!existing) {
      return this.create({
        userId,
        isVerified: data.isVerified ?? false,
        bio: data.bio,
        description: data.description,
        coverSrc: data.coverSrc,
        cityId: data.cityId,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        timezone: data.timezone,
      });
    }

    const fields: string[] = [];
    const params: Record<string, unknown> = { userId: Number(userId), updatedAt: nowIso() };
    const assign = (col: string, value: unknown) => {
      fields.push(`${col} = @${col}`);
      params[col] = value;
    };

    if (data.bio !== undefined) assign('bio', data.bio);
    if (data.isVerified !== undefined) assign('isVerified', data.isVerified ? 1 : 0);
    if (data.description !== undefined) assign('description', data.description);
    if (data.coverSrc !== undefined) assign('coverSrc', data.coverSrc);
    if (data.cityId !== undefined) assign('cityId', data.cityId ? Number(data.cityId) : null);
    if (data.dateOfBirth !== undefined)
      assign('dateOfBirth', data.dateOfBirth ? data.dateOfBirth.toISOString() : null);
    if (data.gender !== undefined) assign('gender', data.gender);
    if (data.address !== undefined) assign('address', data.address);
    if (data.timezone !== undefined) assign('timezone', data.timezone);

    fields.push('updatedAt = @updatedAt');
    db.prepare(`UPDATE profiles SET ${fields.join(', ')} WHERE userId = @userId`).run(params);

    return (await this.findByUserId(userId))!;
  }
}
