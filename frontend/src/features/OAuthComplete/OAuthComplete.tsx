'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { oauthExchange } from '@/features/auth-api/authApi';
import { useAppDispatch } from '@/processes/store/hooks';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { FeedbackText, LoaderMain } from '@/shared/ui';
import { ROUTES, safeNextPath } from '@/shared/lib/routes';

/**
 * Finishes an OAuth login: takes the backend handoff token from the URL and
 * exchanges it through the same-origin proxy, so the session cookies are set
 * on the frontend origin.
 */
export function OAuthComplete() {
  const router = useRouter();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const handoff = params.get('handoff');
    const nextPath = safeNextPath(params.get('next'));
    if (!handoff) {
      setError('Missing handoff token');
      return;
    }
    oauthExchange(handoff)
      .then(async () => {
        await dispatch(loadMeThunk());
        router.replace(nextPath);
      })
      .catch(() => setError('Could not complete sign-in. Please try again.'));
  }, [params, router, dispatch]);

  if (error) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <h2>Sign-in failed</h2>
        <FeedbackText tone="error">{error}</FeedbackText>
        <Link href={ROUTES.signIn}>Back to sign in</Link>
      </div>
    );
  }
  return <LoaderMain label="Completing sign-in…" />;
}
