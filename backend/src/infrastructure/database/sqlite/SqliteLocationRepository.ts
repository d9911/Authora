import { City, Country, LocationRepository, Region } from '../../../modules/location/domain';
import { getSqlite } from './connection';
import { mapCity, mapCountry, mapRegion } from './mappers';

export class SqliteLocationRepository implements LocationRepository {
  async listCountries(): Promise<Country[]> {
    const rows = getSqlite().prepare('SELECT * FROM countries ORDER BY name ASC').all();
    return rows.map(mapCountry);
  }

  async findCountryById(id: string): Promise<Country | null> {
    const row = getSqlite().prepare('SELECT * FROM countries WHERE id = ?').get(Number(id));
    return row ? mapCountry(row) : null;
  }

  async findRegionsByCountry(countryId: string): Promise<Region[]> {
    const rows = getSqlite()
      .prepare('SELECT * FROM regions WHERE countryId = ? ORDER BY name ASC')
      .all(Number(countryId));
    return rows.map(mapRegion);
  }

  async findRegionById(id: string): Promise<Region | null> {
    const row = getSqlite().prepare('SELECT * FROM regions WHERE id = ?').get(Number(id));
    return row ? mapRegion(row) : null;
  }

  async findCitiesByRegion(regionId: string): Promise<City[]> {
    const rows = getSqlite()
      .prepare('SELECT * FROM cities WHERE regionId = ? ORDER BY name ASC')
      .all(Number(regionId));
    return rows.map(mapCity);
  }

  async findCitiesByCountry(countryId: string): Promise<City[]> {
    const rows = getSqlite()
      .prepare('SELECT * FROM cities WHERE countryId = ? ORDER BY name ASC')
      .all(Number(countryId));
    return rows.map(mapCity);
  }

  async findCityById(id: string): Promise<City | null> {
    const row = getSqlite().prepare('SELECT * FROM cities WHERE id = ?').get(Number(id));
    return row ? mapCity(row) : null;
  }
}
