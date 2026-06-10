import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Country } from '@/shared/types';
import {
  fetchCountries,
  fetchCountryById,
} from '@/entities/country/api/locationApi';

interface LocationState {
  countries: Country[];
  current: Country | null;
  loading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  countries: [],
  current: null,
  loading: false,
  error: null,
};

export const loadCountriesThunk = createAsyncThunk('location/loadCountries', async () => {
  return fetchCountries();
});

export const loadCountryByIdThunk = createAsyncThunk(
  'location/loadCountryById',
  async (id: string) => {
    return fetchCountryById(id);
  },
);

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCountriesThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadCountriesThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = action.payload;
      })
      .addCase(loadCountriesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load countries';
      })
      .addCase(loadCountryByIdThunk.fulfilled, (state, action) => {
        state.current = action.payload;
      });
  },
});

export default locationSlice.reducer;
