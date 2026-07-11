export const PASSWORD_ALLOWED_REGEX = /^[A-Za-zÑñ0-9!@#$%^&*()_+=.,?:~\[\]]{8,50}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 50;

export function validatePassword(password: string): boolean {
  return PASSWORD_ALLOWED_REGEX.test(password);
}
