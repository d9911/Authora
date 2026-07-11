'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  telegramRecoveryPoll,
  telegramRecoveryStart,
} from '@/features/password-reset/api/passwordResetApi';
import { ButtonMain, FeedbackText } from '@/shared/ui';
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { translateError, useCurrentLocale } from '@/shared/i18n';
import styles from './PasswordResetForm.module.scss';

const POLL_INTERVAL_MS = 2000;

export function TelegramRecoveryPanel({ nextPath }: { nextPath: string | null }) {
  const { t } = useTranslation('auth');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<ErrorDescriptor | { localized: string } | null>(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const finishPath = () => {
    const params = new URLSearchParams({ ready: '1', channel: 'telegram' });
    if (nextPath) params.set('next', nextPath);
    router.replace(`${routes.resetPassword}?${params.toString()}`);
  };

  const schedulePoll = (token: string) => {
    timer.current = setTimeout(async () => {
      if (!active.current) return;
      try {
        const result = await telegramRecoveryPoll(token);
        if (!active.current) return;
        if (result.status === 'pending') {
          schedulePoll(token);
          return;
        }
        setWaiting(false);
        if (result.status === 'verified') {
          finishPath();
          return;
        }
        if (result.status === 'cancelled') {
          setError({ localized: t('passwordRecovery.telegram.error.cancelled') });
          return;
        }
        if (result.status === 'not_linked') {
          setError({ localized: t('passwordRecovery.telegram.error.notLinked') });
          return;
        }
        setError({ localized: t('passwordRecovery.telegram.error.expired') });
      } catch (pollError) {
        if (!active.current) return;
        setWaiting(false);
        setError(getErrorDescriptor(pollError));
      }
    }, POLL_INTERVAL_MS);
  };

  const start = async () => {
    setError(null);
    setConfirmationCode(null);
    setFallbackUrl(null);
    setBusy(true);
    const popup = window.open(routes.telegramOpening, '_blank');
    try {
      if (popup) popup.opener = null;
    } catch {
      // Some browsers prevent changing opener after window creation.
    }
    try {
      const result = await telegramRecoveryStart();
      if (!result.botUrl) {
        setError({ localized: t('passwordRecovery.telegram.error.botNotConfigured') });
        popup?.close();
        return;
      }
      setConfirmationCode(result.confirmationCode);
      setFallbackUrl(result.botUrl);
      if (popup) popup.location.replace(result.botUrl);
      setWaiting(true);
      schedulePoll(result.token);
    } catch (startError) {
      try {
        popup?.close();
      } catch {
        // Ignore popup lifecycle errors.
      }
      setError(getErrorDescriptor(startError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles['telegram-panel']}>
      <p className={styles['recovery-copy']}>
        {t('passwordRecovery.telegram.description')}
      </p>
      <ButtonMain type="button" fullWidth loading={busy} disabled={waiting} onClick={start}>
        {waiting
          ? t('passwordRecovery.telegram.action.waiting')
          : t('passwordRecovery.telegram.action.start')}
      </ButtonMain>
      {waiting && confirmationCode ? (
        <div className={styles['confirmation-code']} aria-live="polite">
          <span>{t('passwordRecovery.telegram.confirmationCode.description')}</span>
          <strong>{confirmationCode}</strong>
        </div>
      ) : null}
      {waiting && fallbackUrl ? (
        <a className={styles['telegram-link']} href={fallbackUrl} target="_blank" rel="noreferrer">
          {t('passwordRecovery.telegram.action.openManually')}
        </a>
      ) : null}
      {error ? (
        <FeedbackText tone="error">
          {'localized' in error ? error.localized : translateError(tErrors, error)}
        </FeedbackText>
      ) : null}
    </div>
  );
}
