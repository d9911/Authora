import crypto from 'crypto';
import sharp from 'sharp';
import { AppError } from '../../../core/errors/AppError';
import { ProfileImageKind, ProfileImageWrite } from '../domain/ProfileImage';

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;
const COVER_MAX_BYTES = 10 * 1024 * 1024;
const OUTPUT_CONTENT_TYPE = 'image/webp';
const LIMIT_INPUT_PIXELS = 40_000_000;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface ProcessProfileImageInput {
  kind: ProfileImageKind;
  data: Buffer;
  mimeType: string;
}

export class ProfileImageProcessor {
  async process(input: ProcessProfileImageInput): Promise<ProfileImageWrite> {
    const mimeType = normalizeMimeType(input.mimeType);
    const maxBytes = input.kind === 'avatar' ? AVATAR_MAX_BYTES : COVER_MAX_BYTES;
    const label = input.kind === 'avatar' ? 'Avatar' : 'Cover';

    if (input.data.length > maxBytes) {
      throw AppError.validation(`${label} image must be ${maxBytes / 1024 / 1024} MB or smaller`);
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType) || detectMimeType(input.data) !== mimeType) {
      throw AppError.validation('Only JPEG, PNG, and WebP images are allowed');
    }

    const target = input.kind === 'avatar' ? { width: 512, height: 512 } : { width: 1920, height: 640 };
    const processed = await sharp(input.data, { limitInputPixels: LIMIT_INPUT_PIXELS })
      .rotate()
      .resize(target.width, target.height, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 90 })
      .toBuffer({ resolveWithObject: true });

    return {
      data: processed.data,
      contentType: OUTPUT_CONTENT_TYPE,
      sizeBytes: processed.data.length,
      width: processed.info.width,
      height: processed.info.height,
      etag: crypto.createHash('sha256').update(processed.data).digest('hex'),
    };
  }
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.trim().toLowerCase();
}

function detectMimeType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}
