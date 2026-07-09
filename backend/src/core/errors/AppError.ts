/**
 * Centralized error catalog. Every error that can reach the frontend
 * has a stable machine-readable `code` and an HTTP status.
 *
 * GraphQL resolvers throw AppError; the formatError hook maps it into
 * a consistent { message, code, statusCode } extension payload.
 */
export const ErrorCodes = {
  // generic
  INTERNAL: 'INTERNAL',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  // auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTH_PROVIDER_NOT_CONFIGURED: 'AUTH_PROVIDER_NOT_CONFIGURED',
  AUTH_PROVIDER_FAILED: 'AUTH_PROVIDER_FAILED',
  MAIL_SEND_FAILED: 'MAIL_SEND_FAILED',
  // 2fa
  NEED_2FA: 'NEED_2FA',
  INVALID_2FA_CODE: 'INVALID_2FA_CODE',
  TWO_FACTOR_ALREADY_ENABLED: 'TWO_FACTOR_ALREADY_ENABLED',
  TWO_FACTOR_NOT_ENABLED: 'TWO_FACTOR_NOT_ENABLED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(ErrorCodes.UNAUTHORIZED, message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(ErrorCodes.FORBIDDEN, message, 403);
  }
  static notFound(message = 'Not found') {
    return new AppError(ErrorCodes.NOT_FOUND, message, 404);
  }
  static validation(message = 'Validation error', details?: unknown) {
    return new AppError(ErrorCodes.VALIDATION, message, 422, details);
  }
  static invalidCredentials(message = 'Invalid email or password') {
    return new AppError(ErrorCodes.INVALID_CREDENTIALS, message, 401);
  }
  static emailTaken(message = 'Email already registered') {
    return new AppError(ErrorCodes.EMAIL_TAKEN, message, 409);
  }
  static needTwoFactor(message = 'Two-factor authentication required') {
    return new AppError(ErrorCodes.NEED_2FA, message, 401);
  }
  static providerNotConfigured(message: string) {
    return new AppError(ErrorCodes.AUTH_PROVIDER_NOT_CONFIGURED, message, 503);
  }
  static providerFailed(message: string) {
    return new AppError(ErrorCodes.AUTH_PROVIDER_FAILED, message, 502);
  }
  static mailSendFailed(message = 'Email delivery failed') {
    return new AppError(ErrorCodes.MAIL_SEND_FAILED, message, 502);
  }
}
