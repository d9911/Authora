import { connectSqlite, disconnectSqlite, getSqlite } from './connection';
import { nowIso } from './mappers';

/**
 * Seeds countries -> regions -> cities into SQLite so the public location
 * pages have data. Idempotent: clears and re-inserts. Mirrors the Mongo seed.
 */
async function seed(): Promise<void> {
  await connectSqlite();
  const db = getSqlite();

  db.exec('DELETE FROM cities; DELETE FROM regions; DELETE FROM countries;');

  const data = [
    {
      name: 'Russia',
      code: 'RU',
      regions: [
        { name: 'Moscow Oblast', cities: ['Moscow', 'Khimki', 'Podolsk'] },
        { name: 'Leningrad Oblast', cities: ['Saint Petersburg', 'Gatchina'] },
      ],
    },
    {
      name: 'United States',
      code: 'US',
      regions: [
        { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
        { name: 'New York', cities: ['New York City', 'Buffalo'] },
      ],
    },
    {
      name: 'Germany',
      code: 'DE',
      regions: [
        { name: 'Bavaria', cities: ['Munich', 'Nuremberg'] },
        { name: 'Berlin', cities: ['Berlin'] },
      ],
    },
  ];

  const now = nowIso();
  const insCountry = db.prepare(
    'INSERT INTO countries (name, code, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
  );
  const insRegion = db.prepare(
    'INSERT INTO regions (name, countryId, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
  );
  const insCity = db.prepare(
    'INSERT INTO cities (name, countryId, regionId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
  );

  const run = db.transaction(() => {
    for (const country of data) {
      const cId = Number(insCountry.run(country.name, country.code, now, now).lastInsertRowid);
      for (const region of country.regions) {
        const rId = Number(insRegion.run(region.name, cId, now, now).lastInsertRowid);
        for (const cityName of region.cities) {
          insCity.run(cityName, cId, rId, now, now);
        }
      }
    }
  });
  run();

  // eslint-disable-next-line no-console
  console.log('[seed:sqlite] done: countries, regions, cities created');
  await disconnectSqlite();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed:sqlite] failed:', err);
  process.exit(1);
});
