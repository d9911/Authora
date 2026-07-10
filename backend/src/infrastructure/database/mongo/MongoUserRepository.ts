import { User } from '../../../modules/user/domain/User';
import {
  CreateUserDto,
  UpdateUserDto,
  UserRepository,
} from '../../../modules/user/domain/UserRepository';
import { UserModel } from './models';
import { mapUser } from './mappers';

export class MongoUserRepository implements UserRepository {
  async create(data: CreateUserDto): Promise<User> {
    const doc = await UserModel.create({
      email: data.email.toLowerCase(),
      emailKind: data.emailKind ?? 'contactable',
      password: data.password,
      name: data.name,
      nickname: data.nickname,
      phoneNumber: data.phoneNumber,
      telegramId: data.telegramId,
      avatarUrl: data.avatarUrl,
      githubId: data.githubId,
      emailVerified: data.emailVerified ?? false,
      authVersion: data.authVersion ?? 0,
    });
    return mapUser(doc);
  }

  async findById(id: string): Promise<User | null> {
    if (!id) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? mapUser(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return doc ? mapUser(doc) : null;
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ githubId }).lean();
    return doc ? mapUser(doc) : null;
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ telegramId }).lean();
    return doc ? mapUser(doc) : null;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const set: Record<string, unknown> = {};
    const unset: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null) unset[key] = '';
      else if (value !== undefined) set[key] = value;
    }
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const doc = await UserModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) throw new Error(`User not found: ${id}`);
    return mapUser(doc);
  }

  async updatePasswordAndIncrementAuthVersion(
    id: string,
    password: string,
    emailVerified?: boolean,
  ): Promise<User> {
    const set: Record<string, unknown> = { password };
    if (emailVerified !== undefined) set.emailVerified = emailVerified;
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: set, $inc: { authVersion: 1 } },
      { new: true },
    ).lean();
    if (!doc) throw new Error(`User not found: ${id}`);
    return mapUser(doc);
  }

  async consumeTwoFactorRecoveryCode(id: string, codeHash: string): Promise<boolean> {
    const result = await UserModel.updateOne(
      { _id: id, twoFactorRecoveryCodeHashes: codeHash },
      { $pull: { twoFactorRecoveryCodeHashes: codeHash } },
    );
    return result.modifiedCount === 1;
  }
}
