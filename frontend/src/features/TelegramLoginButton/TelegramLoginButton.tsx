'use client';

import { useEffect, useRef } from 'react';
import { config } from '@/shared/config';

/**
 * Telegram Login Widget. Renders the official Telegram button which, after the
 * user authorizes, redirects to the backend callback with a SIGNED payload that
 * the backend verifies (plan §8/§22). Requires NEXT_PUBLIC_TELEGRAM_BOT to be
 * the bot's username (without @). If not configured, nothing is rendered.
 *
 * When `linkToken` is provided, the callback URL carries ?link=<token> so the
 * backend links Telegram to the already-authenticated user instead of logging in.
 */
export function TelegramLoginButton({ linkToken }: { linkToken?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT;

  useEffect(() => {
    if (!botUsername || !ref.current) return;
    ref.current.innerHTML = '';
    const authUrl =
      `${config.backendPublicUrl}/api/auth/telegram/callback` +
      (linkToken ? `?link=${encodeURIComponent(linkToken)}` : '');
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '20');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-auth-url', authUrl);
    ref.current.appendChild(script);
  }, [botUsername, linkToken]);

  if (!botUsername) return null;
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center' }} />;
}
