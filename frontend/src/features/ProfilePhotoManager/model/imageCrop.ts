import { ProfileImageKind } from '@/shared/types';

export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const LIMITS: Record<ProfileImageKind, number> = {
  AVATAR: 10 * 1024 * 1024,
  COVER: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set(PROFILE_IMAGE_ACCEPT.split(','));

export type ProfileImageValidationError =
  | { code: 'UNSUPPORTED_TYPE' }
  | { code: 'FILE_TOO_LARGE'; maxSizeMb: number };

export function validateProfileImageFile(
  kind: ProfileImageKind,
  file: File,
): ProfileImageValidationError | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { code: 'UNSUPPORTED_TYPE' };
  }
  const limit = LIMITS[kind];
  if (file.size > limit) {
    return { code: 'FILE_TOO_LARGE', maxSizeMb: limit / 1024 / 1024 };
  }
  return null;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const value = String(reader.result ?? '');
      const [, base64] = value.split(',');
      if (!base64) {
        reject(new Error('Could not read image file.'));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}
