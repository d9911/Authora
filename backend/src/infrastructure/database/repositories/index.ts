import { env } from '../../../config/env';
import { UserRepository } from '../../../modules/user/domain/UserRepository';
import { ProfileRepository } from '../../../modules/profile/domain/ProfileRepository';
import { RefreshTokenRepository } from '../../../modules/auth/domain/RefreshTokenRepository';
import { LocationRepository } from '../../../modules/location/domain';
import { ProfileImageRepository } from '../../../modules/profile-photo/domain/ProfileImageRepository';

import { EmailTokenRepository } from '../../../modules/auth/domain/EmailTokenRepository';
import { RecoveryGrantRepository } from '../../../modules/auth/domain/RecoveryGrantRepository';

import { MongoUserRepository } from '../mongo/MongoUserRepository';
import { MongoProfileRepository } from '../mongo/MongoProfileRepository';
import { MongoRefreshTokenRepository } from '../mongo/MongoRefreshTokenRepository';
import { MongoLocationRepository } from '../mongo/MongoLocationRepository';
import { MongoEmailTokenRepository } from '../mongo/MongoEmailTokenRepository';
import { MongoProfileImageRepository } from '../mongo/MongoProfileImageRepository';
import { MongoRecoveryGrantRepository } from '../mongo/MongoRecoveryGrantRepository';

import { SqliteUserRepository } from '../sqlite/SqliteUserRepository';
import { SqliteProfileRepository } from '../sqlite/SqliteProfileRepository';
import { SqliteRefreshTokenRepository } from '../sqlite/SqliteRefreshTokenRepository';
import { SqliteLocationRepository } from '../sqlite/SqliteLocationRepository';
import { SqliteEmailTokenRepository } from '../sqlite/SqliteEmailTokenRepository';
import { SqliteProfileImageRepository } from '../sqlite/SqliteProfileImageRepository';
import { SqliteRecoveryGrantRepository } from '../sqlite/SqliteRecoveryGrantRepository';

export interface Repositories {
  users: UserRepository;
  profiles: ProfileRepository;
  refreshTokens: RefreshTokenRepository;
  emailTokens: EmailTokenRepository;
  recoveryGrants: RecoveryGrantRepository;
  profileImages: ProfileImageRepository;
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
        recoveryGrants: new MongoRecoveryGrantRepository(),
        profileImages: new MongoProfileImageRepository(),
        locations: new MongoLocationRepository(),
      };
    case 'sqlite':
      return {
        users: new SqliteUserRepository(),
        profiles: new SqliteProfileRepository(),
        refreshTokens: new SqliteRefreshTokenRepository(),
        emailTokens: new SqliteEmailTokenRepository(),
        recoveryGrants: new SqliteRecoveryGrantRepository(),
        profileImages: new SqliteProfileImageRepository(),
        locations: new SqliteLocationRepository(),
      };
    case 'postgres':
      throw new Error(
        `DB_TYPE="postgres" is not implemented yet. Use DB_TYPE=mongo or DB_TYPE=sqlite.`,
      );
    default:
      throw new Error(`Unknown DB_TYPE: ${env.dbType}`);
  }
}
