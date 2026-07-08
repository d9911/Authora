export const PASSWORD_ALLOWED_REGEX = /^[A-Za-zÑñ0-9!@#$%^&*()_+=.,?:~\[\]]{8,50}$/;

export const PASSWORD_POLICY_HINT =
  'Пароль должен быть 8–50 символов. Разрешены латинские буквы A–Z/a–z, Ñ/ñ, цифры 0–9 и символы: ! @ # $ % ^ & * ( ) _ + = . , ? : ~ [ ].';

export function validatePassword(password: string): boolean {
  return PASSWORD_ALLOWED_REGEX.test(password);
}
