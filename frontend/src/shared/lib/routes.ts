const APP_ORIGIN = 'http://authora.local';

export const ROUTES = {
  home: '/',
  countries: '/country',
  about: '/about',
  profileEdit: '/profile/edit',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  confirmEmail: '/confirm-email',
  telegramOpening: '/oauth/telegram/opening',
  country: (id: string) => `/country/${id}`,
  region: (id: string) => `/region/${id}`,
  city: (id: string) => `/city/${id}`,
} as const;

export function optionalNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function safeNextPath(
  value: string | null,
  fallback: string = ROUTES.profileEdit,
): string {
  return optionalNextPath(value) ?? fallback;
}
