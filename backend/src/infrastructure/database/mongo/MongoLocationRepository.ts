import { City, Country, LocationRepository, Region } from '../../../modules/location/domain';
import { CityModel, CountryModel, RegionModel } from './models';
import { mapCity, mapCountry, mapRegion } from './mappers';

export class MongoLocationRepository implements LocationRepository {
  async listCountries(): Promise<Country[]> {
    const docs = await CountryModel.find().sort({ name: 1 }).lean();
    return docs.map(mapCountry);
  }
  async findCountryById(id: string): Promise<Country | null> {
    const doc = await CountryModel.findById(id).lean();
    return doc ? mapCountry(doc) : null;
  }
  async findRegionsByCountry(countryId: string): Promise<Region[]> {
    const docs = await RegionModel.find({ countryId }).sort({ name: 1 }).lean();
    return docs.map(mapRegion);
  }
  async findRegionById(id: string): Promise<Region | null> {
    const doc = await RegionModel.findById(id).lean();
    return doc ? mapRegion(doc) : null;
  }
  async findCitiesByRegion(regionId: string): Promise<City[]> {
    const docs = await CityModel.find({ regionId }).sort({ name: 1 }).lean();
    return docs.map(mapCity);
  }
  async findCitiesByCountry(countryId: string): Promise<City[]> {
    const docs = await CityModel.find({ countryId }).sort({ name: 1 }).lean();
    return docs.map(mapCity);
  }
  async findCityById(id: string): Promise<City | null> {
    const doc = await CityModel.findById(id).lean();
    return doc ? mapCity(doc) : null;
  }
}
