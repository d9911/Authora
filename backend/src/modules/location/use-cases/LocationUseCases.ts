import { City, Country, LocationRepository, Region } from '../domain';

export class LocationUseCases {
  constructor(private readonly repo: LocationRepository) {}

  listCountries(): Promise<Country[]> {
    return this.repo.listCountries();
  }
  getCountry(id: string): Promise<Country | null> {
    return this.repo.findCountryById(id);
  }
  getRegionsByCountry(countryId: string): Promise<Region[]> {
    return this.repo.findRegionsByCountry(countryId);
  }
  getRegion(id: string): Promise<Region | null> {
    return this.repo.findRegionById(id);
  }
  getCitiesByRegion(regionId: string): Promise<City[]> {
    return this.repo.findCitiesByRegion(regionId);
  }
  getCitiesByCountry(countryId: string): Promise<City[]> {
    return this.repo.findCitiesByCountry(countryId);
  }
  getCity(id: string): Promise<City | null> {
    return this.repo.findCityById(id);
  }
}
