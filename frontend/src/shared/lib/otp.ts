export const DEFAULT_OTP_LENGTH = 6;

export function normalizeNumericCode(value: string, length = DEFAULT_OTP_LENGTH): string {
  return value.replace(/\D/g, '').slice(0, length);
}
