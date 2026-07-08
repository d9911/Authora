import { ProfileImage, ProfileImageKind, ProfileImageWrite } from './ProfileImage';

export interface ProfileImageRepository {
  findByUserAndKind(userId: string, kind: ProfileImageKind): Promise<ProfileImage | null>;
  upsert(userId: string, kind: ProfileImageKind, image: ProfileImageWrite): Promise<ProfileImage>;
  delete(userId: string, kind: ProfileImageKind): Promise<void>;
}
