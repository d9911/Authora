import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import locationReducer from './slices/locationSlice';
import uiReducer from './slices/uiSlice';

export const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  location: locationReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
