import {
  ProfileImage,
  ProfileImageKind,
  ProfileImageWrite,
} from '../../../modules/profile-photo/domain/ProfileImage';
import { ProfileImageRepository } from '../../../modules/profile-photo/domain/ProfileImageRepository';
import { getSqlite } from './connection';
import { mapProfileImage, nowIso } from './mappers';

export class SqliteProfileImageRepository implements ProfileImageRepository {
  async findByUserAndKind(userId: string, kind: ProfileImageKind): Promise<ProfileImage | null> {
    const row = getSqlite()
      .prepare('SELECT * FROM profile_images WHERE userId = ? AND kind = ?')
      .get(Number(userId), kind);
    return row ? mapProfileImage(row) : null;
  }

  async upsert(
    userId: string,
    kind: ProfileImageKind,
    image: ProfileImageWrite,
  ): Promise<ProfileImage> {
    const db = getSqlite();
    const existing = await this.findByUserAndKind(userId, kind);
    const now = nowIso();

    if (existing) {
      db.prepare(
        `UPDATE profile_images
         SET contentType = @contentType,
             data = @data,
             sizeBytes = @sizeBytes,
             width = @width,
             height = @height,
             etag = @etag,
             updatedAt = @updatedAt
         WHERE userId = @userId AND kind = @kind`,
      ).run({
        userId: Number(userId),
        kind,
        ...image,
        updatedAt: now,
      });
    } else {
      db.prepare(
        `INSERT INTO profile_images
         (userId, kind, contentType, data, sizeBytes, width, height, etag, createdAt, updatedAt)
         VALUES
         (@userId, @kind, @contentType, @data, @sizeBytes, @width, @height, @etag, @createdAt, @updatedAt)`,
      ).run({
        userId: Number(userId),
        kind,
        ...image,
        createdAt: now,
        updatedAt: now,
      });
    }

    return (await this.findByUserAndKind(userId, kind))!;
  }

  async delete(userId: string, kind: ProfileImageKind): Promise<void> {
    getSqlite()
      .prepare('DELETE FROM profile_images WHERE userId = ? AND kind = ?')
      .run(Number(userId), kind);
  }
}
