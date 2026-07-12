import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/shared/types'
import * as authApi from '@/features/auth-api/authApi'
import { fetchMe } from '@/entities/user/api/userApi'
import { getErrorDescriptor } from '@/shared/lib/errors'
import type { ErrorDescriptor } from '@/shared/lib/errors'

export interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'authenticated' | 'guest'
  error: string | null
  errorCode: string | null
  currentLoadMeRequestId: string | null
  // Set when sign-in returns NEED_2FA; the page swaps to the code form.
  twoFactorToken: string | null
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  errorCode: null,
  currentLoadMeRequestId: null,
  twoFactorToken: null,
}

export const loadMeThunk = createAsyncThunk<
  User | null,
  void,
  { state: { auth: AuthState } }
>(
  'auth/loadMe',
  async () => fetchMe(),
  {
    condition: (_input, { getState }) => getState().auth.status !== 'loading',
  },
)

export const signInThunk = createAsyncThunk('auth/signIn', async (input: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.signIn(input)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

export const signUpThunk = createAsyncThunk('auth/signUp', async (input: { email: string; password: string; name?: string; nickname?: string }, { rejectWithValue }) => {
    try {
      return await authApi.signUp(input)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

export const signInTwoFactorThunk = createAsyncThunk('auth/signInTwoFactor', async (input: { twoFactorToken: string; code: string }, { rejectWithValue }) => {
    try {
      return await authApi.signInTwoFactor(input)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

export const logoutThunk = createAsyncThunk<
  boolean,
  void,
  { rejectValue: ErrorDescriptor }
>('auth/logout', async (_input, { rejectWithValue }) => {
  try {
    return await authApi.logout()
  } catch (error) {
    return rejectWithValue(getErrorDescriptor(error, 'Logout failed'))
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
      state.errorCode = null
    },
    setAuthUser(state, action: PayloadAction<User | null>) {
      state.currentLoadMeRequestId = null
      state.user = action.payload
      state.status = action.payload ? 'authenticated' : 'guest'
    },
    resetTwoFactor(state) {
      state.twoFactorToken = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMeThunk.pending, (state, action) => {
        state.currentLoadMeRequestId = action.meta.requestId
        state.status = 'loading'
      })
      .addCase(loadMeThunk.fulfilled, (state, action) => {
        if (state.currentLoadMeRequestId !== action.meta.requestId) return
        state.currentLoadMeRequestId = null
        state.user = action.payload
        state.status = action.payload ? 'authenticated' : 'guest'
      })
      .addCase(loadMeThunk.rejected, (state, action) => {
        if (state.currentLoadMeRequestId !== action.meta.requestId) return
        state.currentLoadMeRequestId = null
        state.user = null
        state.status = 'guest'
      })
      // sign in
      .addCase(signInThunk.pending, (state) => {
        state.currentLoadMeRequestId = null
        if (state.status === 'loading') state.status = 'guest'
        state.error = null
        state.errorCode = null
      })
      .addCase(signInThunk.fulfilled, (state, action) => {
        state.error = null
        state.errorCode = null
        if (action.payload.needTwoFactor) {
          state.twoFactorToken = action.payload.twoFactorToken ?? null
        } else {
          state.user = action.payload.user ?? null
          state.status = 'authenticated'
          state.twoFactorToken = null
        }
      })
      .addCase(signInThunk.rejected, (state, action) => {
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Sign in failed'
        state.errorCode = error?.code ?? null
      })
      // sign up
      .addCase(signUpThunk.pending, (state) => {
        state.currentLoadMeRequestId = null
        if (state.status === 'loading') state.status = 'guest'
        state.error = null
        state.errorCode = null
      })
      .addCase(signUpThunk.fulfilled, (state, action) => {
        state.error = null
        state.errorCode = null
        state.user = action.payload.user ?? null
        state.status = 'authenticated'
      })
      .addCase(signUpThunk.rejected, (state, action) => {
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Sign up failed'
        state.errorCode = error?.code ?? null
      })
      // 2fa login
      .addCase(signInTwoFactorThunk.pending, (state) => {
        state.currentLoadMeRequestId = null
        if (state.status === 'loading') state.status = 'guest'
        state.error = null
        state.errorCode = null
      })
      .addCase(signInTwoFactorThunk.fulfilled, (state, action) => {
        state.error = null
        state.errorCode = null
        state.user = action.payload.user ?? null
        state.status = 'authenticated'
        state.twoFactorToken = null
      })
      .addCase(signInTwoFactorThunk.rejected, (state, action) => {
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Invalid code'
        state.errorCode = error?.code ?? null
      })
      // logout
      .addCase(logoutThunk.pending, (state) => {
        state.currentLoadMeRequestId = null
        if (state.status === 'loading') state.status = 'guest'
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.status = 'guest'
        state.twoFactorToken = null
        state.error = null
        state.errorCode = null
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        const error = action.payload
        state.user = null
        state.status = 'guest'
        state.twoFactorToken = null
        state.error = error?.message ?? 'Logout failed'
        state.errorCode = error?.code ?? null
      })
  },
})

export const { clearAuthError, resetTwoFactor, setAuthUser } = authSlice.actions

type AuthRootState = { auth: AuthState }

export const selectAuthUser = (state: AuthRootState) => state.auth.user
export const selectAuthStatus = (state: AuthRootState) => state.auth.status
export const selectIsAuthenticated = (state: AuthRootState) =>
  state.auth.status === 'authenticated'
export const selectAuthIsLoading = (state: AuthRootState) =>
  state.auth.status === 'idle' || state.auth.status === 'loading'
export const selectAuthError = (state: AuthRootState) => state.auth.error
export const selectAuthErrorCode = (state: AuthRootState) => state.auth.errorCode

export default authSlice.reducer
