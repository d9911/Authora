import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Profile } from '@/shared/types';
import {
  fetchMyProfile,
  updateProfile,
  UpdateProfileInput,
} from '@/entities/profile/api/profileApi';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  saving: false,
  error: null,
  saved: false,
};

const errMessage = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Unexpected error';

export const loadMyProfileThunk = createAsyncThunk('profile/loadMine', async () => {
  return fetchMyProfile();
});

export const updateProfileThunk = createAsyncThunk(
  'profile/update',
  async (input: UpdateProfileInput, { rejectWithValue }) => {
    try {
      return await updateProfile(input);
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileFlags(state) {
      state.error = null;
      state.saved = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMyProfileThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadMyProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(loadMyProfileThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateProfileThunk.pending, (state) => {
        state.saving = true;
        state.saved = false;
        state.error = null;
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.saving = false;
        state.saved = true;
        state.profile = action.payload;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Save failed';
      });
  },
});

export const { clearProfileFlags } = profileSlice.actions;
export default profileSlice.reducer;
