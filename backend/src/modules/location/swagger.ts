/** Swagger documentation for the Location module (public). */
export const locationSwagger = {
  tags: [
    { name: 'Location', description: 'Public country / region / city queries (no auth required).' },
  ],
  examples: {
    Countries: {
      summary: 'List all countries',
      value: { query: 'query { countries { id name code } }' },
    },
    CountryById: {
      summary: 'Country with its regions and cities',
      value: {
        query:
          'query Country($id: ID!) { country(id: $id) { id name regions { id name } cities { id name } } }',
        variables: { id: '<country-id>' },
      },
    },
    RegionById: {
      summary: 'Region with its cities',
      value: {
        query: 'query Region($id: ID!) { region(id: $id) { id name cities { id name } } }',
        variables: { id: '<region-id>' },
      },
    },
    CityById: {
      summary: 'A single city',
      value: {
        query: 'query City($id: ID!) { city(id: $id) { id name countryId regionId } }',
        variables: { id: '<city-id>' },
      },
    },
  },
};
