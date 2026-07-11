'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { oauthExchange } from '@/features/auth-api/authApi';
import { useAppDispatch } from '@/processes/store/hooks';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { FeedbackText, LoaderMain } from '@/shared/ui';
import { getLocalizedRoutes, safeNextPath } from '@/shared/lib/routes';
import { useCurrentLocale } from '@/shared/i18n';

/**
 * Finishes an OAuth login: takes the backend handoff token from the URL and
 * exchanges it through the same-origin proxy, so the session cookies are set
 * on the frontend origin.
 */
export function OAuthComplete() {
  const { t } = useTranslation('auth');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handoff = params.get('handoff');
    const nextPath = safeNextPath(params.get('next'), routes.profileEdit);
    if (!handoff) {
      setError(t('oauthComplete.errors.missingHandoff'));
      return;
    }
    oauthExchange(handoff)
      .then(async () => {
        await dispatch(loadMeThunk());
        router.replace(nextPath);
      })
      .catch(() => setError(t('oauthComplete.errors.exchangeFailed')));
  }, [params, router, dispatch, routes.profileEdit, t]);

  if (error) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <h2>{t('oauthComplete.failureTitle')}</h2>
        <FeedbackText tone="error">{error}</FeedbackText>
        <Link href={routes.signIn}>{t('oauthComplete.backToSignIn')}</Link>
      </div>
    );
  }
  return <LoaderMain label={t('oauthComplete.loadingLabel')} />;
}
