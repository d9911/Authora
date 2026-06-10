import { Profile } from './Profile';

export interface CreateProfileDto {
  userId: string;
  isVerified?: boolean;
  bio?: string;
  description?: string;
  coverSrc?: string;
  cityId?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  timezone?: string;
}

export interface UpdateProfileDto {
  bio?: string;
  isVerified?: boolean;
  description?: string;
  coverSrc?: string;
  cityId?: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  timezone?: string;
}

export interface ProfileRepository {
  create(data: CreateProfileDto): Promise<Profile>;
  findByUserId(userId: string): Promise<Profile | null>;
  update(userId: string, data: UpdateProfileDto): Promise<Profile>;
}
