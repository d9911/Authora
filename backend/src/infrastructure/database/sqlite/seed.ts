import { connectSqlite, disconnectSqlite, getSqlite } from './connection';
import { nowIso } from './mappers';
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
 * relevant tables and re-inserts. Mirrors the Mongo seed.
 */
async function seed(): Promise<void> {
  await connectSqlite();
  const db = getSqlite();

  db.exec(`
    DELETE FROM cities; DELETE FROM regions; DELETE FROM countries;
    DELETE FROM email_tokens; DELETE FROM refresh_tokens;
    DELETE FROM profiles; DELETE FROM users;
  `);

  const now = nowIso();

  // ---- Locations ----
  const insCountry = db.prepare(
    'INSERT INTO countries (name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
  );
  const insRegion = db.prepare(
    'INSERT INTO regions (name, countryId, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
  );
  const insCity = db.prepare(
    'INSERT INTO cities (name, countryId, regionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
  );
  let countryCount = 0;
  let regionCount = 0;
  let cityCount = 0;

  const insertLocations = db.transaction(() => {
    for (const country of SEED_COUNTRIES) {
      const cId = Number(insCountry.run(country.name, country.code, now, now).lastInsertRowid);
      countryCount++;
      for (const region of country.regions) {
        const rId = Number(insRegion.run(region.name, cId, now, now).lastInsertRowid);
        regionCount++;
        for (const cityName of region.cities) {
          insCity.run(cityName, cId, rId, now, now);
          cityCount++;
        }
      }
    }
  });
  insertLocations();

  // ---- Users (+ profiles) ----
  const insUser = db.prepare(
    `INSERT INTO users
       (name, email, password, nickname, emailVerified, twoFactorEnabled, twoFactorSecret, createdAt, updatedAt)
     VALUES (@name, @email, @password, @nickname, @emailVerified, @twoFactorEnabled, @twoFactorSecret, @now, @now)`,
  );
  const insProfile = db.prepare(
    `INSERT INTO profiles
       (userId, bio, isVerified, description, gender, timezone, address, createdAt, updatedAt)
     VALUES (@userId, @bio, @isVerified, @description, @gender, @timezone, @address, @now, @now)`,
  );

  const createUser = async (u: SeedUser): Promise<void> => {
    const passwordHash = await hashPassword(u.password);
    const secret = u.twoFactor ? base32FromHex(u.twoFactor.secretHex) : null;
    const userId = Number(
      insUser.run({
        name: u.name,
        email: u.email.toLowerCase(),
        password: passwordHash,
        nickname: u.nickname ?? null,
        emailVerified: u.emailVerified ? 1 : 0,
        twoFactorEnabled: secret ? 1 : 0,
        twoFactorSecret: secret,
        now,
      }).lastInsertRowid,
    );
    insProfile.run({
      userId,
      bio: u.profile.bio ?? null,
      isVerified: u.emailVerified ? 1 : 0,
      description: u.profile.description ?? null,
      gender: u.profile.gender ?? null,
      timezone: u.profile.timezone ?? null,
      address: u.profile.address ?? null,
      now,
    });
  };

  for (const u of [KEY_USER, ...DEMO_USERS]) {
    await createUser(u);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed:sqlite] done: ${countryCount} countries, ${regionCount} regions, ${cityCount} cities, ` +
      `${1 + DEMO_USERS.length} users (key: ${KEY_USER.email}, 2FA on)`,
  );
  await disconnectSqlite();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:sqlite] failed:', err);
  process.exit(1);
});
