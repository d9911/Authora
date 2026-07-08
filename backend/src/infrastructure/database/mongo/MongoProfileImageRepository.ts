import {
  ProfileImage,
  ProfileImageKind,
  ProfileImageWrite,
} from '../../../modules/profile-photo/domain/ProfileImage';
import { ProfileImageRepository } from '../../../modules/profile-photo/domain/ProfileImageRepository';
import { ProfileImageModel } from './models';
import { mapProfileImage } from './mappers';

export class MongoProfileImageRepository implements ProfileImageRepository {
  async findByUserAndKind(userId: string, kind: ProfileImageKind): Promise<ProfileImage | null> {
    const doc = await ProfileImageModel.findOne({ userId, kind }).lean();
    return doc ? mapProfileImage(doc) : null;
  }

  async upsert(
    userId: string,
    kind: ProfileImageKind,
    image: ProfileImageWrite,
  ): Promise<ProfileImage> {
    const doc = await ProfileImageModel.findOneAndUpdate(
      { userId, kind },
      {
        $set: {
          contentType: image.contentType,
          data: image.data,
          sizeBytes: image.sizeBytes,
          width: image.width,
          height: image.height,
          etag: image.etag,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return mapProfileImage(doc);
  }

  async delete(userId: string, kind: ProfileImageKind): Promise<void> {
    await ProfileImageModel.deleteOne({ userId, kind });
  }
}
