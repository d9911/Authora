import type { TFunction } from 'i18next';

export const errorKeyByCode = {
  INTERNAL: 'internal',
  VALIDATION: 'validation',
  NOT_FOUND: 'notFound',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  INVALID_CREDENTIALS: 'invalidCredentials',
  EMAIL_TAKEN: 'emailTaken',
  EMAIL_NOT_VERIFIED: 'emailNotVerified',
  INVALID_TOKEN: 'invalidToken',
  TOKEN_EXPIRED: 'tokenExpired',
  RECOVERY_TOKEN_INVALID: 'recoveryTokenInvalid',
  RECOVERY_TOKEN_EXPIRED: 'recoveryTokenExpired',
  RECOVERY_NOT_AVAILABLE: 'recoveryNotAvailable',
  RECOVERY_CANCELLED: 'recoveryCancelled',
  AUTH_PROVIDER_NOT_CONFIGURED: 'authProviderNotConfigured',
  AUTH_PROVIDER_FAILED: 'authProviderFailed',
  MAIL_SEND_FAILED: 'mailSendFailed',
  NEED_2FA: 'needTwoFactor',
  INVALID_2FA_CODE: 'invalidTwoFactorCode',
  TWO_FACTOR_ALREADY_ENABLED: 'twoFactorAlreadyEnabled',
  TWO_FACTOR_NOT_ENABLED: 'twoFactorNotEnabled',
  RATE_LIMITED: 'rateLimited',
  BACKEND_UNREACHABLE: 'backendUnreachable',
  PAYLOAD_TOO_LARGE: 'payloadTooLarge',
} as const;

export type ErrorTranslationKey =
  | (typeof errorKeyByCode)[keyof typeof errorKeyByCode]
  | 'fallback'
  | 'loadProfile'
  | 'saveProfile'
  | 'uploadImage'
  | 'deleteImage'
  | 'sendRecovery'
  | 'changePassword'
  | 'checkTelegram'
  | 'openTelegram';

export type TranslatableError = unknown;

function errorCode(error: TranslatableError): string | null {
  if (!error || typeof error !== 'object') return null;
  if ('code' in error && typeof error.code === 'string') return error.code;
  return null;
}

/**
 * Converts stable backend codes to localized copy. Raw backend messages are
 * deliberately not rendered; unknown errors use a localized safe fallback.
 */
export function translateError(
  t: TFunction,
  error: TranslatableError,
  fallbackKey: ErrorTranslationKey = 'fallback',
): string {
  const code = errorCode(error);
  const key = code
    ? errorKeyByCode[code as keyof typeof errorKeyByCode]
    : undefined;
  return t(key ?? fallbackKey);
}
