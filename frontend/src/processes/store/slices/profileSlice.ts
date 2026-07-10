import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { Profile } from '@/shared/types'
import { fetchMyProfile, updateProfile, UpdateProfileInput } from '@/entities/profile/api/profileApi'
import { deleteProfileImage, uploadProfileImage, UploadProfileImageInput } from '@/entities/profile-photo/api/profilePhotoApi'
import { ProfileImageKind } from '@/shared/types'
import { getErrorMessage } from '@/shared/lib/errors'

interface ProfileState {
  profile: Profile | null
  loaded: boolean
  loading: boolean
  saving: boolean
  error: string | null
  saved: boolean
}

const initialState: ProfileState = {
  profile: null,
  loaded: false,
  loading: false,
  saving: false,
  error: null,
  saved: false,
}

export const loadMyProfileThunk = createAsyncThunk('profile/loadMine', async () => {
  return fetchMyProfile()
})

export const updateProfileThunk = createAsyncThunk('profile/update', async (input: UpdateProfileInput, { rejectWithValue }) => {
    try {
      return await updateProfile(input)
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, 'Unexpected error'))
  }
})

export const uploadProfileImageThunk = createAsyncThunk('profilePhoto/upload', async (input: UploadProfileImageInput, { rejectWithValue }) => {
    try {
      return await uploadProfileImage(input)
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, 'Unexpected error'))
  }
})

export const deleteProfileImageThunk = createAsyncThunk('profilePhoto/delete', async (kind: ProfileImageKind, { rejectWithValue }) => {
    try {
      return await deleteProfileImage(kind)
    } catch (e) {
      return rejectWithValue(getErrorMessage(e, 'Unexpected error'))
  }
})

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileFlags(state) {
      state.error = null
      state.saved = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMyProfileThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadMyProfileThunk.fulfilled, (state, action) => {
        state.loading = false
        state.loaded = true
        state.profile = action.payload
      })
      .addCase(loadMyProfileThunk.rejected, (state, action) => {
        state.loading = false
        state.loaded = true
        state.error = action.error.message ?? 'Failed to load profile'
      })
      .addCase(updateProfileThunk.pending, (state) => {
        state.saving = true
        state.saved = false
        state.error = null
      })
      .addCase(updateProfileThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.saving = false
        state.error = (action.payload as string) ?? 'Save failed'
      })
      .addCase(uploadProfileImageThunk.pending, (state) => {
        state.saving = true
        state.error = null
        state.saved = false
      })
      .addCase(uploadProfileImageThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload.profile
      })
      .addCase(uploadProfileImageThunk.rejected, (state, action) => {
        state.saving = false
        state.error = (action.payload as string) ?? 'Image upload failed'
      })
      .addCase(deleteProfileImageThunk.pending, (state) => {
        state.saving = true
        state.error = null
        state.saved = false
      })
      .addCase(deleteProfileImageThunk.fulfilled, (state, action) => {
        state.saving = false
        state.saved = true
        state.profile = action.payload.profile
      })
      .addCase(deleteProfileImageThunk.rejected, (state, action) => {
        state.saving = false
        state.error = (action.payload as string) ?? 'Image delete failed'
      })
  },
})

export const { clearProfileFlags } = profileSlice.actions
export default profileSlice.reducer
