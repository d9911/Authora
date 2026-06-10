import { env } from '../../../config/env';
import { UserRepository } from '../../../modules/user/domain/UserRepository';
import { ProfileRepository } from '../../../modules/profile/domain/ProfileRepository';
import { RefreshTokenRepository } from '../../../modules/auth/domain/RefreshTokenRepository';
import { LocationRepository } from '../../../modules/location/domain';

import { MongoUserRepository } from '../mongo/MongoUserRepository';
import { MongoProfileRepository } from '../mongo/MongoProfileRepository';
import { MongoRefreshTokenRepository } from '../mongo/MongoRefreshTokenRepository';
import { MongoLocationRepository } from '../mongo/MongoLocationRepository';
import {
  EmailTokenRepository,
  MongoEmailTokenRepository,
} from '../mongo/MongoEmailTokenRepository';

export interface Repositories {
  users: UserRepository;
  profiles: ProfileRepository;
  refreshTokens: RefreshTokenRepository;
  emailTokens: EmailTokenRepository;
  locations: LocationRepository;
}

/**
 * Repository factory. Selecting the database is a single switch here;
 * the rest of the app only sees the interfaces.
 *
 * MVP ships the Mongo implementations. Postgres (Sequelize) and SQLite
 * implementations plug in here later without touching use cases.
 */
export function createRepositories(): Repositories {
  switch (env.dbType) {
    case 'mongo':
      return {
        users: new MongoUserRepository(),
        profiles: new MongoProfileRepository(),
        refreshTokens: new MongoRefreshTokenRepository(),
        emailTokens: new MongoEmailTokenRepository(),
        locations: new MongoLocationRepository(),
      };
    case 'postgres':
    case 'sqlite':
      throw new Error(
        `DB_TYPE="${env.dbType}" is not implemented yet in the MVP. Use DB_TYPE=mongo.`,
      );
    default:
      throw new Error(`Unknown DB_TYPE: ${env.dbType}`);
  }
}
