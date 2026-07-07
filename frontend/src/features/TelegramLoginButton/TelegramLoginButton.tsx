'use client';

import { useEffect, useRef, useState } from 'react';
import { telegramBotStart, telegramBotPoll } from '@/features/auth-api/authApi';
import { useAppDispatch } from '@/shared/hooks/redux';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';

function writePopupMessage(popup: Window | null, title: string, message: string): void {
  if (!popup) return;
  try {
    popup.document.title = title;
    popup.document.body.innerHTML = `
      <main style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.45">
        <h1 style="font-size: 18px; margin: 0 0 8px">${title}</h1>
        <p style="margin: 0; color: #5c6c75">${message}</p>
      </main>
    `;
  } catch {
    /* The popup may already have navigated away. */
  }
}

function openTelegramPopup(): Window | null {
  const popup = window.open('', '_blank');
  try {
    if (popup) popup.opener = null;
  } catch {
    /* ignore browsers that do not allow changing opener */
  }
  writePopupMessage(popup, 'Opening Telegram…', 'Please wait while Authora creates a secure login link.');
  return popup;
}

function closePopupOrExplain(popup: Window | null, message: string): void {
  if (!popup) return;
  try {
    popup.close();
  } catch {
    writePopupMessage(popup, 'Telegram did not open', message);
  }
}

/**
 * Telegram **bot deep-link** login (works on localhost — no widget/HTTPS domain
 * needed). Clicking opens the bot (https://t.me/<bot>?start=<ticket>); when the
 * user taps Start, the backend resolves the ticket and this component (which is
 * polling) finishes the login or link.
 *
 *  - default: login flow → redirects to /profile/edit on success
 *  - `mode="link"`: links Telegram to the current authed user → onLinked()
 */
export function TelegramLoginButton({
  mode = 'login',
  onLinked,
}: {
  mode?: 'login' | 'link';
  onLinked?: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{ botUrl: string; command: string } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const start = async () => {
    setError(null);
    setFallback(null);
    setBusy(true);
    const popup = openTelegramPopup();
    try {
      const { token, botUrl } = await telegramBotStart(mode === 'link');
      if (!botUrl) {
        closePopupOrExplain(popup, 'Telegram bot is not configured on the server.');
        setError('Telegram bot is not configured on the server.');
        setBusy(false);
        return;
      }
      setFallback({ botUrl, command: `/start ${token}` });
      if (popup) {
        popup.location.replace(botUrl);
      }
      setBusy(false);
      setWaiting(true);

      // Poll until resolved or expired (~5 min).
      timer.current = setInterval(async () => {
        try {
          const res = await telegramBotPoll(token);
          if (res.status === 'pending') return;
          if (timer.current) clearInterval(timer.current);
          setWaiting(false);
          if (res.status === 'expired') {
            setFallback(null);
            setError('Login link expired. Please try again.');
            return;
          }
          if (res.status === 'linked') {
            setFallback(null);
            await dispatch(loadMeThunk());
            onLinked?.();
            return;
          }
          if (res.status === 'done') {
            window.location.assign('/profile/edit');
          }
        } catch (e) {
          if (timer.current) clearInterval(timer.current);
          setWaiting(false);
          setError(handle(e));
        }
      }, 2000);
    } catch (e) {
      closePopupOrExplain(popup, handle(e));
      setError(handle(e));
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <ButtonMain
        variant="secondary"
        fullWidth
        type="button"
        loading={busy}
        disabled={waiting}
        onClick={start}
      >
        {waiting ? 'Waiting for Telegram…' : 'Continue with Telegram'}
      </ButtonMain>
      {waiting && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Press <strong>Start</strong> in the opened Telegram chat, then come back here.
        </p>
      )}
      {waiting && fallback && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          If Telegram did not open,{' '}
          <a href={fallback.botUrl} target="_blank" rel="noopener noreferrer">
            open it here
          </a>{' '}
          or send <code>{fallback.command}</code> to the bot.
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
