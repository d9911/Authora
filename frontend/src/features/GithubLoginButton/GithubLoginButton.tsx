'use client';

import { ButtonMain } from '@/shared/ui';
import { config } from '@/shared/config';

/**
 * GitHub OAuth entry point. This is a full-page redirect to the BACKEND
 * (not the same-origin proxy): backend -> GitHub -> backend callback -> sets
 * cookies -> redirects to the frontend profile page.
 */
export function GithubLoginButton() {
  const onClick = () => {
    window.location.href = `${config.backendPublicUrl}/api/auth/github`;
  };
  return (
    <ButtonMain variant="secondary" fullWidth onClick={onClick} type="button">
      Continue with GitHub
    </ButtonMain>
  );
}
