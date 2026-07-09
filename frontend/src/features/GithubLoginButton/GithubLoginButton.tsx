'use client';

import { useSearchParams } from 'next/navigation';
import { ButtonMain } from '@/shared/ui';
import { config } from '@/shared/config';
import { optionalNextPath } from '@/shared/lib/routes';

/**
 * GitHub OAuth entry point. This is a full-page redirect to the BACKEND
 * (not the same-origin proxy): backend -> GitHub -> backend callback -> sets
 * cookies -> redirects to the frontend profile page.
 */
export function GithubLoginButton() {
  const searchParams = useSearchParams();
  const nextPath = optionalNextPath(searchParams.get('next'));

  const onClick = () => {
    const url = new URL('/api/auth/github', config.backendPublicUrl);
    if (nextPath) url.searchParams.set('next', nextPath);
    window.location.href = url.toString();
  };
  return (
    <ButtonMain variant="secondary" fullWidth onClick={onClick} type="button">
      Continue with GitHub
    </ButtonMain>
  );
}
