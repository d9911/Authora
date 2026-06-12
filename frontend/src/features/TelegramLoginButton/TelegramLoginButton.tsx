'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { telegramBotStart, telegramBotPoll } from '@/features/auth-api/authApi';
import { useAppDispatch } from '@/shared/hooks/redux';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';

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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const { token, botUrl } = await telegramBotStart(mode === 'link');
      if (!botUrl) {
        setError('Telegram bot is not configured on the server.');
        setBusy(false);
        return;
      }
      // Open the bot so the user can press Start.
      window.open(botUrl, '_blank', 'noopener,noreferrer');
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
            setError('Login link expired. Please try again.');
            return;
          }
          if (res.status === 'linked') {
            await dispatch(loadMeThunk());
            onLinked?.();
            return;
          }
          if (res.status === 'done') {
            await dispatch(loadMeThunk());
            router.push('/profile/edit');
          }
        } catch (e) {
          if (timer.current) clearInterval(timer.current);
          setWaiting(false);
          setError(handle(e));
        }
      }, 2000);
    } catch (e) {
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
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
