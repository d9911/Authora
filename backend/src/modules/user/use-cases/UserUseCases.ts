import { AppError } from '../../../core/errors/AppError';
import { PublicUser, toPublicUser } from '../domain/User';
import { UserRepository } from '../domain/UserRepository';

export class UserUseCases {
  constructor(private readonly users: UserRepository) {}

  async getById(id: string): Promise<PublicUser | null> {
    const user = await this.users.findById(id);
    return user ? toPublicUser(user) : null;
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    return toPublicUser(user);
  }
}
