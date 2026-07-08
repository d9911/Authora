import { ProfileImageKind } from '@/shared/types';

export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const LIMITS: Record<ProfileImageKind, number> = {
  AVATAR: 10 * 1024 * 1024,
  COVER: 10 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set(PROFILE_IMAGE_ACCEPT.split(','));

export function validateProfileImageFile(kind: ProfileImageKind, file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed.';
  }
  const limit = LIMITS[kind];
  if (file.size > limit) {
    return `${kind === 'AVATAR' ? 'Avatar' : 'Cover'} image must be ${
      limit / 1024 / 1024
    } MB or smaller.`;
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
