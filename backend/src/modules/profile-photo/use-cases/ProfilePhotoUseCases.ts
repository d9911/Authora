import { AppError } from '../../../core/errors/AppError';
import { Profile } from '../../profile/domain/Profile';
import { ProfileRepository } from '../../profile/domain/ProfileRepository';
import { PublicUser, toPublicUser } from '../../user/domain/User';
import { UserRepository } from '../../user/domain/UserRepository';
import {
  ProfileImage,
  ProfileImageKind,
  ProfileImageMetadata,
  profileImageUrl,
  toProfileImageMetadata,
} from '../domain/ProfileImage';
import { ProfileImageRepository } from '../domain/ProfileImageRepository';
import { ProfileImageProcessor } from '../services/ProfileImageProcessor';

export interface ProfileImageUploadInput {
  kind: ProfileImageKind | string;
  dataBase64: string;
  mimeType: string;
}

export interface ProfileImagePayload {
  user: PublicUser;
  profile: Profile;
  image: ProfileImageMetadata | null;
}

export interface ProfilePhotoDeps {
  users: UserRepository;
  profiles: ProfileRepository;
  profileImages: ProfileImageRepository;
  processor: Pick<ProfileImageProcessor, 'process'>;
}

export class ProfilePhotoUseCases {
  constructor(private readonly deps: ProfilePhotoDeps) {}

  async upload(userId: string, input: ProfileImageUploadInput): Promise<ProfileImagePayload> {
    const kind = normalizeKind(input.kind);
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    const data = decodeBase64(input.dataBase64);
    const processed = await this.deps.processor.process({
      kind,
      data,
      mimeType: input.mimeType,
    });
    const image = await this.deps.profileImages.upsert(userId, kind, processed);
    const url = profileImageUrl(userId, kind, image.etag);

    if (kind === 'avatar') {
      const updatedUser = await this.deps.users.update(userId, { avatarUrl: url });
      const profile = await this.ensureProfile(userId);
      return { user: toPublicUser(updatedUser), profile, image: toProfileImageMetadata(image) };
    }

    const profile = await this.deps.profiles.update(userId, { coverSrc: url });
    return { user: toPublicUser(user), profile, image: toProfileImageMetadata(image) };
  }

  async delete(userId: string, kindInput: ProfileImageKind | string): Promise<ProfileImagePayload> {
    const kind = normalizeKind(kindInput);
    const user = await this.deps.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    await this.deps.profileImages.delete(userId, kind);

    if (kind === 'avatar') {
      const updatedUser = await this.deps.users.update(userId, { avatarUrl: null });
      const profile = await this.ensureProfile(userId);
      return { user: toPublicUser(updatedUser), profile, image: null };
    }

    const profile = await this.deps.profiles.update(userId, { coverSrc: null });
    return { user: toPublicUser(user), profile, image: null };
  }

  async getImage(userId: string, kindInput: ProfileImageKind | string): Promise<ProfileImage | null> {
    return this.deps.profileImages.findByUserAndKind(userId, normalizeKind(kindInput));
  }

  private async ensureProfile(userId: string): Promise<Profile> {
    const profile = await this.deps.profiles.findByUserId(userId);
    return profile ?? this.deps.profiles.update(userId, {});
  }
}

function normalizeKind(kind: ProfileImageKind | string): ProfileImageKind {
  const normalized = kind.toLowerCase();
  if (normalized === 'avatar' || normalized === 'cover') return normalized;
  throw AppError.validation('Profile image kind must be avatar or cover');
}

function decodeBase64(value: string): Buffer {
  const raw = value.trim().replace(/^data:[^;]+;base64,/, '');
  if (!raw || raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw AppError.validation('Invalid image payload');
  }
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length || buffer.toString('base64') !== raw) {
    throw AppError.validation('Invalid image payload');
  }
  return buffer;
}
