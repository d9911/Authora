import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { User } from '@/shared/types';
import * as authApi from '@/features/auth-api/authApi';
import { fetchMe } from '@/entities/user/api/userApi';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'guest';
  error: string | null;
  // Set when sign-in returns NEED_2FA; the page swaps to the code form.
  twoFactorToken: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  twoFactorToken: null,
};

function errMessage(e: unknown): string {
  if (e instanceof GraphQLRequestError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Unexpected error';
}

export const loadMeThunk = createAsyncThunk('auth/loadMe', async () => {
  return fetchMe();
});

export const signInThunk = createAsyncThunk(
  'auth/signIn',
  async (input: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.signIn(input);
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  },
);

export const signUpThunk = createAsyncThunk(
  'auth/signUp',
  async (
    input: { email: string; password: string; name?: string; nickname?: string },
    { rejectWithValue },
  ) => {
    try {
      return await authApi.signUp(input);
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  },
);

export const signInTwoFactorThunk = createAsyncThunk(
  'auth/signInTwoFactor',
  async (input: { twoFactorToken: string; code: string }, { rejectWithValue }) => {
    try {
      return await authApi.signInTwoFactor(input);
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  },
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
  return true;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    resetTwoFactor(state) {
      state.twoFactorToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMeThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'guest';
      })
      .addCase(loadMeThunk.rejected, (state) => {
        state.status = 'guest';
      })
      // sign in
      .addCase(signInThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(signInThunk.fulfilled, (state, action) => {
        if (action.payload.needTwoFactor) {
          state.twoFactorToken = action.payload.twoFactorToken ?? null;
        } else {
          state.user = action.payload.user ?? null;
          state.status = 'authenticated';
          state.twoFactorToken = null;
        }
      })
      .addCase(signInThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Sign in failed';
      })
      // sign up
      .addCase(signUpThunk.fulfilled, (state, action) => {
        state.user = action.payload.user ?? null;
        state.status = 'authenticated';
      })
      .addCase(signUpThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Sign up failed';
      })
      // 2fa login
      .addCase(signInTwoFactorThunk.fulfilled, (state, action) => {
        state.user = action.payload.user ?? null;
        state.status = 'authenticated';
        state.twoFactorToken = null;
      })
      .addCase(signInTwoFactorThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Invalid code';
      })
      // logout
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.status = 'guest';
        state.twoFactorToken = null;
      });
  },
});

export const { clearAuthError, resetTwoFactor } = authSlice.actions;
export default authSlice.reducer;
