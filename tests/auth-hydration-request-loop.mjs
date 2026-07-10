import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const authSlice = read('frontend/src/processes/store/slices/authSlice.ts');
const profileSlice = read('frontend/src/processes/store/slices/profileSlice.ts');
const locationSlice = read('frontend/src/processes/store/slices/locationSlice.ts');
const editProfile = read('frontend/src/features/EditProfileForm/EditProfileForm.tsx');

assert.match(authSlice, /addCase\(loadMeThunk\.pending/);
assert.match(authSlice, /getState\(\)\.auth\.status !== 'loading'/);
assert.match(profileSlice, /loaded:\s*boolean/);
assert.match(locationSlice, /loaded:\s*boolean/);
assert.match(editProfile, /locationsLoaded/);
assert.match(editProfile, /profileLoaded/);
assert.doesNotMatch(editProfile, /countries\.length === 0 && !locationsLoading/);

console.log('Auth hydration request-loop checks passed');
