'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ButtonMain } from '@/shared/ui';
import { config } from '@/shared/config';
import {
  getLocalizedRoutes,
  getPostAuthRedirectPath,
} from '@/shared/lib/routes';
import { useCurrentLocale } from '@/shared/i18n';

/**
 * GitHub OAuth entry point. This is a full-page redirect to the BACKEND
 * (not the same-origin proxy): backend -> GitHub -> backend callback -> sets
 * cookies -> redirects to the frontend profile page.
 */
export function GithubLoginButton() {
  const { t } = useTranslation('auth');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');

  const onClick = () => {
    const url = new URL('/api/auth/github', config.backendPublicUrl);
    url.searchParams.set(
      'next',
      getPostAuthRedirectPath(
        requestedNextPath,
        routes.profileEdit,
        window.location.hash,
      ),
    );
    window.location.href = url.toString();
  };
  return (
    <ButtonMain variant="secondary" fullWidth onClick={onClick} type="button">
      {t('github.action.continue')}
    </ButtonMain>
  );
}
