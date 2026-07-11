import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Profile } from '@/shared/types'
import { fetchMyProfile, updateProfile, UpdateProfileInput } from '@/entities/profile/api/profileApi'
import { deleteProfileImage, uploadProfileImage, UploadProfileImageInput } from '@/entities/profile-photo/api/profilePhotoApi'
import { ProfileImageKind } from '@/shared/types'
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors'

interface ProfileState {
  profile: Profile | null
  loaded: boolean
  loading: boolean
  saving: boolean
  error: string | null
  errorCode: string | null
  saved: boolean
}

const initialState: ProfileState = {
  profile: null,
  loaded: false,
  loading: false,
  saving: false,
  error: null,
  errorCode: null,
  saved: false,
}

export const loadMyProfileThunk = createAsyncThunk('profile/loadMine', async (_input, { rejectWithValue }) => {
  try {
    return await fetchMyProfile()
  } catch (e) {
    return rejectWithValue(getErrorDescriptor(e, 'Failed to load profile'))
  }
})

export const updateProfileThunk = createAsyncThunk('profile/update', async (input: UpdateProfileInput, { rejectWithValue }) => {
    try {
      return await updateProfile(input)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

export const uploadProfileImageThunk = createAsyncThunk('profilePhoto/upload', async (input: UploadProfileImageInput, { rejectWithValue }) => {
    try {
      return await uploadProfileImage(input)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

export const deleteProfileImageThunk = createAsyncThunk('profilePhoto/delete', async (kind: ProfileImageKind, { rejectWithValue }) => {
    try {
      return await deleteProfileImage(kind)
    } catch (e) {
      return rejectWithValue(getErrorDescriptor(e, 'Unexpected error'))
  }
})

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileFlags(state) {
      state.error = null
      state.errorCode = null
      state.saved = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMyProfileThunk.pending, (state) => {
        state.loading = true
        state.error = null
        state.errorCode = null
      })
      .addCase(loadMyProfileThunk.fulfilled, (state, action) => {
        state.loading = false
        state.loaded = true
        state.profile = action.payload
      })
      .addCase(loadMyProfileThunk.rejected, (state, action) => {
        state.loading = false
        state.loaded = true
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Failed to load profile'
        state.errorCode = error?.code ?? null
      })
      .addCase(updateProfileThunk.pending, (state) => {
        state.saving = true
        state.saved = false
        state.error = null
        state.errorCode = null
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.saving = false
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Save failed'
        state.errorCode = error?.code ?? null
      })
      .addCase(uploadProfileImageThunk.pending, (state) => {
        state.saving = true
        state.error = null
        state.errorCode = null
        state.saved = false
      })
      .addCase(uploadProfileImageThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload.profile
      })
      .addCase(uploadProfileImageThunk.rejected, (state, action) => {
        state.saving = false
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Image upload failed'
        state.errorCode = error?.code ?? null
      })
      .addCase(deleteProfileImageThunk.pending, (state) => {
        state.saving = true
        state.error = null
        state.errorCode = null
        state.saved = false
      })
      .addCase(deleteProfileImageThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload.profile
      })
      .addCase(deleteProfileImageThunk.rejected, (state, action) => {
        state.saving = false
        const error = action.payload as ErrorDescriptor | undefined
        state.error = error?.message ?? 'Image delete failed'
        state.errorCode = error?.code ?? null
      })
  },
})

export const { clearProfileFlags } = profileSlice.actions
export default profileSlice.reducer
