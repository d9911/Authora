import { connectMongo, disconnectMongo } from './connection';
import {
  CityModel,
  CountryModel,
  EmailTokenModel,
  ProfileModel,
  RefreshTokenModel,
  RegionModel,
  UserModel,
} from './models';
import { hashPassword } from '../../jwt/hash';
import {
  base32FromHex,
  DEMO_USERS,
  KEY_USER,
  SEED_COUNTRIES,
  SeedUser,
} from '../seed-data';

/**
 * Seeds locations (countries -> regions -> cities) AND users (with profiles
 * and optional 2FA), including the key owner account. Idempotent: clears the
 * relevant collections and re-inserts. Mirrors the SQLite seed.
 */
async function seed(): Promise<void> {
  await connectMongo();

  await Promise.all([
    CityModel.deleteMany({}),
    RegionModel.deleteMany({}),
    CountryModel.deleteMany({}),
    ProfileModel.deleteMany({}),
    UserModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
    EmailTokenModel.deleteMany({}),
  ]);

  // ---- Locations ----
  let countryCount = 0;
  let regionCount = 0;
  let cityCount = 0;
  for (const country of SEED_COUNTRIES) {
    const c = await CountryModel.create({ name: country.name, code: country.code });
    countryCount++;
    for (const region of country.regions) {
      const r = await RegionModel.create({ name: region.name, countryId: c._id });
      regionCount++;
      for (const cityName of region.cities) {
        await CityModel.create({ name: cityName, countryId: c._id, regionId: r._id });
        cityCount++;
      }
    }
  }

  // ---- Users (+ profiles) ----
  const createUser = async (u: SeedUser): Promise<void> => {
    const passwordHash = await hashPassword(u.password);
    const secret = u.twoFactor ? base32FromHex(u.twoFactor.secretHex) : undefined;
    const user = await UserModel.create({
      name: u.name,
      email: u.email.toLowerCase(),
      password: passwordHash,
      nickname: u.nickname,
      emailVerified: u.emailVerified,
      twoFactorEnabled: Boolean(secret),
      twoFactorSecret: secret,
    });
    await ProfileModel.create({
      userId: user._id,
      bio: u.profile.bio,
      isVerified: u.emailVerified,
      description: u.profile.description,
      gender: u.profile.gender,
      timezone: u.profile.timezone,
      address: u.profile.address,
    });
  };

  for (const u of [KEY_USER, ...DEMO_USERS]) {
    await createUser(u);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed:mongo] done: ${countryCount} countries, ${regionCount} regions, ${cityCount} cities, ` +
      `${1 + DEMO_USERS.length} users (key: ${KEY_USER.email}, 2FA on)`,
  );
  await disconnectMongo();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:mongo] failed:', err);
  process.exit(1);
});
