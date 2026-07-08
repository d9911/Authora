import { AppError } from '../../../core/errors/AppError';
import { Profile } from '../domain/Profile';
import { ProfileRepository, UpdateProfileDto } from '../domain/ProfileRepository';
import { UserRepository, UpdateUserDto } from '../../user/domain/UserRepository';
import { PublicUser, toPublicUser } from '../../user/domain/User';

export interface UpdateProfileInput {
  // user fields
  name?: string;
  nickname?: string;
  phoneNumber?: string;
  // profile fields
  bio?: string;
  description?: string;
  cityId?: string | null;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  timezone?: string;
}

export class ProfileUseCases {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly users: UserRepository,
  ) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    return this.profiles.findByUserId(userId);
  }

  async update(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<{ profile: Profile; user: PublicUser }> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();

    const userPatch: UpdateUserDto = {};
    if (input.name !== undefined) userPatch.name = input.name;
    if (input.nickname !== undefined) userPatch.nickname = input.nickname;
    if (input.phoneNumber !== undefined) userPatch.phoneNumber = input.phoneNumber;

    const profilePatch: UpdateProfileDto = {};
    if (input.bio !== undefined) profilePatch.bio = input.bio;
    if (input.description !== undefined) profilePatch.description = input.description;
    if (input.cityId !== undefined) profilePatch.cityId = input.cityId;
    if (input.dateOfBirth !== undefined) profilePatch.dateOfBirth = input.dateOfBirth;
    if (input.gender !== undefined) profilePatch.gender = input.gender;
    if (input.address !== undefined) profilePatch.address = input.address;
    if (input.timezone !== undefined) profilePatch.timezone = input.timezone;

    const updatedUser =
      Object.keys(userPatch).length > 0 ? await this.users.update(userId, userPatch) : user;
    const profile = await this.profiles.update(userId, profilePatch);

    return { profile, user: toPublicUser(updatedUser) };
  }
}
