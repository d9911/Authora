'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trans, useTranslation } from 'react-i18next';
import { telegramBotStart, telegramBotPoll } from '@/features/auth-api/authApi';
import { useAppDispatch } from '@/processes/store/hooks';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, FeedbackText } from '@/shared/ui';
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors';
import {
  getLocalizedRoutes,
  getPostAuthRedirectPath,
} from '@/shared/lib/routes';
import { translateError, useCurrentLocale } from '@/shared/i18n';

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

function openTelegramPopup(path: string, title: string, message: string): Window | null {
  const popup = window.open(path, '_blank');
  try {
    if (popup) popup.opener = null;
  } catch {
    /* ignore browsers that do not allow changing opener */
  }
  writePopupMessage(popup, title, message);
  return popup;
}

function closePopupOrExplain(
  popup: Window | null,
  title: string,
  message: string,
): void {
  if (!popup) return;
  try {
    popup.close();
  } catch {
    writePopupMessage(popup, title, message);
  }
}

/**
 * Telegram bot deep-link login. The backend ticket flow remains unchanged;
 * only app-owned navigation and user-facing copy are locale-aware.
 */
export function TelegramLoginButton({
  mode = 'login',
  onLinked,
}: {
  mode?: 'login' | 'link';
  onLinked?: () => void;
}) {
  const { t } = useTranslation('auth');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const linkedTelegramProfilePath = `${routes.profileEdit}?linked=telegram`;
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<ErrorDescriptor | { localized: string } | null>(null);
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
    const popup = openTelegramPopup(
      routes.telegramOpening,
      t('telegram.popup.openingTitle'),
      t('telegram.popup.openingDescription'),
    );
    try {
      const { token, botUrl } = await telegramBotStart(mode === 'link');
      if (!botUrl) {
        const message = t('telegram.error.botNotConfigured');
        closePopupOrExplain(popup, t('telegram.popup.openFailedTitle'), message);
        setError({ localized: message });
        setBusy(false);
        return;
      }
      setFallback({ botUrl, command: `/start ${token}` });
      if (popup) popup.location.replace(botUrl);
      setBusy(false);
      setWaiting(true);

      timer.current = setInterval(async () => {
        try {
          const res = await telegramBotPoll(token);
          if (res.status === 'pending') return;
          if (timer.current) clearInterval(timer.current);
          setWaiting(false);
          if (res.status === 'expired') {
            setFallback(null);
            setError({ localized: t('telegram.error.linkExpired') });
            return;
          }
          if (res.status === 'linked') {
            setFallback(null);
            await dispatch(loadMeThunk());
            onLinked?.();
            window.location.replace(linkedTelegramProfilePath);
            return;
          }
          if (res.status === 'done') {
            window.location.assign(
              getPostAuthRedirectPath(
                requestedNextPath,
                routes.profileEdit,
                window.location.hash,
              ),
            );
          }
        } catch (pollError) {
          if (timer.current) clearInterval(timer.current);
          setWaiting(false);
          setError(getErrorDescriptor(pollError));
        }
      }, 2000);
    } catch (startError) {
      const descriptor = getErrorDescriptor(startError);
      closePopupOrExplain(
        popup,
        t('telegram.popup.openFailedTitle'),
        translateError(tErrors, descriptor),
      );
      setError(descriptor);
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
        {waiting ? t('telegram.action.waiting') : t('telegram.action.continue')}
      </ButtonMain>
      {waiting && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          <Trans
            t={t}
            i18nKey="telegram.instruction.pressStart"
            components={{ strong: <strong /> }}
          />
        </p>
      )}
      {waiting && fallback && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          <Trans
            t={t}
            i18nKey="telegram.instruction.manualFallback"
            values={{ command: fallback.command }}
            components={{
              link: <a href={fallback.botUrl} target="_blank" rel="noopener noreferrer" />,
              command: <code />,
            }}
          />
        </p>
      )}
      {error && (
        <FeedbackText tone="error">
          {'localized' in error ? error.localized : translateError(tErrors, error)}
        </FeedbackText>
      )}
    </div>
  );
}
