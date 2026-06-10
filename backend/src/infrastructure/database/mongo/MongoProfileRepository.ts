import { Profile } from '../../../modules/profile/domain/Profile';
import {
  CreateProfileDto,
  ProfileRepository,
  UpdateProfileDto,
} from '../../../modules/profile/domain/ProfileRepository';
import { ProfileModel } from './models';
import { mapProfile } from './mappers';

export class MongoProfileRepository implements ProfileRepository {
  async create(data: CreateProfileDto): Promise<Profile> {
    const doc = await ProfileModel.create({
      userId: data.userId,
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
    return mapProfile(doc);
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const doc = await ProfileModel.findOne({ userId }).lean();
    return doc ? mapProfile(doc) : null;
  }

  async update(userId: string, data: UpdateProfileDto): Promise<Profile> {
    const set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) set[key] = value;
    }
    const doc = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: set },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return mapProfile(doc);
  }
}
