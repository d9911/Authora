'use client';

import { useSearchParams } from 'next/navigation';
import { ButtonMain } from '@/shared/ui';
import { config } from '@/shared/config';

function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'http://authora.local');
    if (url.origin !== 'http://authora.local') return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * GitHub OAuth entry point. This is a full-page redirect to the BACKEND
 * (not the same-origin proxy): backend -> GitHub -> backend callback -> sets
 * cookies -> redirects to the frontend profile page.
 */
export function GithubLoginButton() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));

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
