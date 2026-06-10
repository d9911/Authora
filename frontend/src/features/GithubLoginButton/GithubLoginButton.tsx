'use client';

import { ButtonMain } from '@/shared/ui';

/**
 * GitHub OAuth entry point. The backend OAuth flow (redirect -> callback)
 * is a post-MVP backend stage; this button points at the proxied start URL.
 */
export function GithubLoginButton() {
  const onClick = () => {
    window.location.href = '/api/auth/github';
  };
  return (
    <ButtonMain variant="ghost" fullWidth onClick={onClick} type="button">
      Continue with GitHub
    </ButtonMain>
  );
}
