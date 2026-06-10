'use client';

import { ButtonMain } from '@/shared/ui';

/**
 * Telegram login entry point. In production this mounts the Telegram Login
 * Widget whose signed payload is verified by the backend (plan §8/§22).
 */
export function TelegramLoginButton() {
  const onClick = () => {
    window.location.href = '/api/auth/telegram';
  };
  return (
    <ButtonMain variant="ghost" fullWidth onClick={onClick} type="button">
      Continue with Telegram
    </ButtonMain>
  );
}
