'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  telegramRecoveryPoll,
  telegramRecoveryStart,
} from '@/features/password-reset/api/passwordResetApi';
import { ButtonMain, FeedbackText } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/errors';
import { ROUTES } from '@/shared/lib/routes';
import styles from './PasswordResetForm.module.scss';

const POLL_INTERVAL_MS = 2000;

export function TelegramRecoveryPanel({ nextPath }: { nextPath: string | null }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    router.replace(`${ROUTES.resetPassword}?${params.toString()}`);
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
          setError('Восстановление отменено в Telegram.');
          return;
        }
        if (result.status === 'not_linked') {
          setError('Этот Telegram не привязан ни к одному аккаунту Authora.');
          return;
        }
        setError('Ссылка восстановления устарела. Запустите процесс ещё раз.');
      } catch (pollError) {
        if (!active.current) return;
        setWaiting(false);
        setError(getErrorMessage(pollError, 'Не удалось проверить Telegram.'));
      }
    }, POLL_INTERVAL_MS);
  };

  const start = async () => {
    setError(null);
    setConfirmationCode(null);
    setFallbackUrl(null);
    setBusy(true);
    const popup = window.open(ROUTES.telegramOpening, '_blank');
    try {
      if (popup) popup.opener = null;
    } catch {
      // Some browsers prevent changing opener after window creation.
    }
    try {
      const result = await telegramRecoveryStart();
      if (!result.botUrl) throw new Error('Telegram bot is not configured on the server.');
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
      setError(getErrorMessage(startError, 'Не удалось открыть Telegram.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles['telegram-panel']}>
      <p className={styles['recovery-copy']}>
        Используйте Telegram, который был привязан к аккаунту до потери доступа.
      </p>
      <ButtonMain type="button" fullWidth loading={busy} disabled={waiting} onClick={start}>
        {waiting ? 'Ожидаем подтверждение в Telegram' : 'Восстановить через Telegram'}
      </ButtonMain>
      {waiting && confirmationCode ? (
        <div className={styles['confirmation-code']} aria-live="polite">
          <span>Сверьте код на сайте и в сообщении бота</span>
          <strong>{confirmationCode}</strong>
        </div>
      ) : null}
      {waiting && fallbackUrl ? (
        <a className={styles['telegram-link']} href={fallbackUrl} target="_blank" rel="noreferrer">
          Открыть Telegram вручную
        </a>
      ) : null}
      {error ? <FeedbackText tone="error">{error}</FeedbackText> : null}
    </div>
  );
}
