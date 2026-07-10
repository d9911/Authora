'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  completePasswordReset,
  exchangePasswordResetToken,
  requestPasswordReset,
} from '@/features/password-reset/api/passwordResetApi';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import { ButtonMain, FeedbackText, InputMain, LoaderMain, PasswordInput } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/errors';
import { PASSWORD_ALLOWED_REGEX, PASSWORD_POLICY_HINT } from '@/shared/lib/passwordPolicy';
import { optionalNextPath, ROUTES } from '@/shared/lib/routes';
import { TelegramRecoveryPanel } from './TelegramRecoveryPanel';
import styles from './PasswordResetForm.module.scss';

const PASSWORD_MISMATCH_ERROR = 'Пароли не совпадают.';

export function PasswordResetForm({ mode }: { mode: 'request' | 'reset' }) {
  const router = useRouter();
  const params = useSearchParams();
  const exchangeStarted = useRef(false);
  const nextPath = optionalNextPath(params.get('next'));
  const token = params.get('token');
  const readyFromUrl = params.get('ready') === '1';

  const [method, setMethod] = useState<'email' | 'telegram'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [ready, setReady] = useState(readyFromUrl);
  const [exchanging, setExchanging] = useState(mode === 'reset' && Boolean(token));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'reset' || !token || exchangeStarted.current) return;
    exchangeStarted.current = true;
    exchangePasswordResetToken(token)
      .then(() => {
        setReady(true);
        const cleanParams = new URLSearchParams({ ready: '1', channel: 'email' });
        if (nextPath) cleanParams.set('next', nextPath);
        window.history.replaceState(null, '', `${ROUTES.resetPassword}?${cleanParams.toString()}`);
      })
      .catch((exchangeError) => {
        setError(getErrorMessage(exchangeError, 'Ссылка восстановления недействительна.'));
      })
      .finally(() => setExchanging(false));
  }, [mode, nextPath, token]);

  const passwordInvalid = password.length > 0 && !PASSWORD_ALLOWED_REGEX.test(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordError = passwordTouched && passwordInvalid ? PASSWORD_POLICY_HINT : null;
  const confirmPasswordError =
    confirmTouched && passwordMismatch ? PASSWORD_MISMATCH_ERROR : null;
  const resetDisabled =
    busy ||
    !ready ||
    !PASSWORD_ALLOWED_REGEX.test(password) ||
    !confirmPassword ||
    password !== confirmPassword;

  const signInHref = nextPath
    ? `${ROUTES.signIn}?next=${encodeURIComponent(nextPath)}`
    : ROUTES.signIn;

  const onRequest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email, nextPath ?? undefined);
      setMessage(
        'Если такой аккаунт существует и к нему привязана почта, ссылка восстановления отправлена.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Не удалось отправить запрос восстановления.'));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);
    setError(null);
    if (!PASSWORD_ALLOWED_REGEX.test(password)) {
      setError(PASSWORD_POLICY_HINT);
      return;
    }
    if (password !== confirmPassword) {
      setError(PASSWORD_MISMATCH_ERROR);
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      const signInParams = new URLSearchParams({ recovered: '1' });
      if (nextPath) signInParams.set('next', nextPath);
      router.replace(`${ROUTES.signIn}?${signInParams.toString()}`);
    } catch (resetError) {
      setError(getErrorMessage(resetError, 'Не удалось изменить пароль.'));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'request') {
    return (
      <AuthFormShell
        onSubmit={method === 'email' ? onRequest : (event) => event.preventDefault()}
        eyebrow="Account recovery"
        title="Восстановление аккаунта"
        subtitle="Выберите способ, который был привязан к аккаунту заранее."
        footer={
          <div className={styles['recovery-footer']}>
            <Link href={signInHref}>Вернуться ко входу</Link>
          </div>
        }
      >
        <div className={styles['method-switch']} role="group" aria-label="Способ восстановления">
          <button
            type="button"
            aria-pressed={method === 'email'}
            onClick={() => setMethod('email')}
          >
            Email
          </button>
          <button
            type="button"
            aria-pressed={method === 'telegram'}
            onClick={() => setMethod('telegram')}
          >
            Telegram
          </button>
        </div>
        {method === 'email' ? (
          <>
            <InputMain
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            {error ? <FeedbackText tone="error">{error}</FeedbackText> : null}
            {message ? (
              <FeedbackText tone="success" role="status" aria-live="polite">
                {message}
              </FeedbackText>
            ) : null}
            <ButtonMain type="submit" fullWidth loading={busy} disabled={!email.trim()}>
              Отправить ссылку
            </ButtonMain>
          </>
        ) : (
          <TelegramRecoveryPanel nextPath={nextPath} />
        )}
      </AuthFormShell>
    );
  }

  if (exchanging) return <LoaderMain label="Проверяем ссылку восстановления…" />;

  if (!ready) {
    return (
      <AuthFormShell
        onSubmit={(event) => event.preventDefault()}
        title="Ссылка недействительна"
        subtitle="Запросите новую ссылку или используйте привязанный Telegram."
      >
        {error ? <FeedbackText tone="error">{error}</FeedbackText> : null}
        <Link className={styles['primary-link']} href={ROUTES.forgotPassword}>
          Начать восстановление заново
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell onSubmit={onReset} title="Новый пароль">
      <PasswordInput
        id="recovery-password"
        label="Новый пароль"
        value={password}
        error={passwordError}
        required
        autoComplete="new-password"
        onBlur={() => setPasswordTouched(true)}
        onChange={(event) => {
          setPassword(event.target.value);
          setError(null);
        }}
      />
      <PasswordInput
        id="recovery-confirm-password"
        label="Повторите пароль"
        value={confirmPassword}
        error={confirmPasswordError}
        required
        autoComplete="new-password"
        onBlur={() => setConfirmTouched(true)}
        onChange={(event) => {
          setConfirmPassword(event.target.value);
          setError(null);
        }}
      />
      {error ? <FeedbackText tone="error">{error}</FeedbackText> : null}
      <ButtonMain type="submit" fullWidth loading={busy} disabled={resetDisabled}>
        Сохранить новый пароль
      </ButtonMain>
    </AuthFormShell>
  );
}
