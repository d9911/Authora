export interface Country {
  id: string;
  name: string;
  code?: string; // ISO code
  createdAt: Date;
  updatedAt: Date;
}

export interface Region {
  id: string;
  name: string;
  countryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface City {
  id: string;
  name: string;
  countryId?: string;
  regionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationRepository {
  // countries
  listCountries(): Promise<Country[]>;
  findCountryById(id: string): Promise<Country | null>;
  // regions
  findRegionsByCountry(countryId: string): Promise<Region[]>;
  findRegionById(id: string): Promise<Region | null>;
  // cities
  findCitiesByRegion(regionId: string): Promise<City[]>;
  findCitiesByCountry(countryId: string): Promise<City[]>;
  findCityById(id: string): Promise<City | null>;
}
