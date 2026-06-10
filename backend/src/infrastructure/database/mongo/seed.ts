import { connectMongo, disconnectMongo } from './connection';
import { CountryModel, RegionModel, CityModel } from './models';

/**
 * Seeds a small set of countries -> regions -> cities so the public
 * location pages have data to display. Idempotent: clears and re-inserts.
 */
async function seed(): Promise<void> {
  await connectMongo();

  await Promise.all([
    CityModel.deleteMany({}),
    RegionModel.deleteMany({}),
    CountryModel.deleteMany({}),
  ]);

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

  for (const country of data) {
    const c = await CountryModel.create({ name: country.name, code: country.code });
    for (const region of country.regions) {
      const r = await RegionModel.create({ name: region.name, countryId: c._id });
      for (const cityName of region.cities) {
        await CityModel.create({ name: cityName, countryId: c._id, regionId: r._id });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('[seed] done: countries, regions, cities created');
  await disconnectMongo();
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  process.exit(1);
});
