'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  completePasswordReset,
  exchangePasswordResetToken,
  requestPasswordReset,
} from '@/features/password-reset/api/passwordResetApi';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import { ButtonMain, FeedbackText, InputMain, LoaderMain, PasswordInput } from '@/shared/ui';
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors';
import {
  PASSWORD_ALLOWED_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/shared/lib/passwordPolicy';
import { getLocalizedRoutes, optionalNextPath } from '@/shared/lib/routes';
import { translateError, useCurrentLocale } from '@/shared/i18n';
import { TelegramRecoveryPanel } from './TelegramRecoveryPanel';
import styles from './PasswordResetForm.module.scss';

export function PasswordResetForm({ mode }: { mode: 'request' | 'reset' }) {
  const { t } = useTranslation('auth');
  const { t: tValidation } = useTranslation('validation');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
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
  const [error, setError] = useState<ErrorDescriptor | { localized: string } | null>(null);
  const passwordPolicyMessage = tValidation('passwordPolicy', {
    min: PASSWORD_MIN_LENGTH,
    max: PASSWORD_MAX_LENGTH,
  });

  useEffect(() => {
    if (mode !== 'reset' || !token || exchangeStarted.current) return;
    exchangeStarted.current = true;
    exchangePasswordResetToken(token)
      .then(() => {
        setReady(true);
        const cleanParams = new URLSearchParams({ ready: '1', channel: 'email' });
        if (nextPath) cleanParams.set('next', nextPath);
        window.history.replaceState(null, '', `${routes.resetPassword}?${cleanParams.toString()}`);
      })
      .catch((exchangeError) => {
        setError(getErrorDescriptor(exchangeError));
      })
      .finally(() => setExchanging(false));
  }, [mode, nextPath, routes.resetPassword, token]);

  const passwordInvalid = password.length > 0 && !PASSWORD_ALLOWED_REGEX.test(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordError = passwordTouched && passwordInvalid ? passwordPolicyMessage : null;
  const confirmPasswordError =
    confirmTouched && passwordMismatch ? tValidation('passwordMismatch') : null;
  const resetDisabled =
    busy ||
    !ready ||
    !PASSWORD_ALLOWED_REGEX.test(password) ||
    !confirmPassword ||
    password !== confirmPassword;

  const signInHref = nextPath
    ? `${routes.signIn}?next=${encodeURIComponent(nextPath)}`
    : routes.signIn;

  const onRequest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email, nextPath ?? undefined);
      setMessage(t('passwordRecovery.message.requestAccepted'));
    } catch (requestError) {
      setError(getErrorDescriptor(requestError));
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
      setError({ localized: passwordPolicyMessage });
      return;
    }
    if (password !== confirmPassword) {
      setError({ localized: tValidation('passwordMismatch') });
      return;
    }
    setBusy(true);
    try {
      const result = await completePasswordReset(password);
      if (result.channel === 'telegram') {
        router.replace(nextPath ?? routes.profileEdit);
        return;
      }
      const signInParams = new URLSearchParams({ recovered: '1' });
      if (nextPath) signInParams.set('next', nextPath);
      router.replace(`${routes.signIn}?${signInParams.toString()}`);
    } catch (resetError) {
      setError(getErrorDescriptor(resetError));
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'request') {
    return (
      <AuthFormShell
        onSubmit={method === 'email' ? onRequest : (event) => event.preventDefault()}
        eyebrow={t('passwordRecovery.request.eyebrow')}
        title={t('passwordRecovery.request.title')}
        subtitle={t('passwordRecovery.request.subtitle')}
        footer={
          <div className={styles['recovery-footer']}>
            <Link href={signInHref}>{t('passwordRecovery.action.backToSignIn')}</Link>
          </div>
        }
      >
        <div
          className={styles['method-switch']}
          role="group"
          aria-label={t('passwordRecovery.method.ariaLabel')}
        >
          <button
            type="button"
            aria-pressed={method === 'email'}
            onClick={() => setMethod('email')}
          >
            {t('passwordRecovery.method.email')}
          </button>
          <button
            type="button"
            aria-pressed={method === 'telegram'}
            onClick={() => setMethod('telegram')}
          >
            {t('passwordRecovery.method.telegram')}
          </button>
        </div>
        {method === 'email' ? (
          <>
            <InputMain
              label={t('passwordRecovery.request.emailLabel')}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            {error ? (
              <FeedbackText tone="error">
                {'localized' in error ? error.localized : translateError(tErrors, error)}
              </FeedbackText>
            ) : null}
            {message ? (
              <FeedbackText tone="success" role="status" aria-live="polite">
                {message}
              </FeedbackText>
            ) : null}
            <ButtonMain type="submit" fullWidth loading={busy} disabled={!email.trim()}>
              {t('passwordRecovery.request.action.sendLink')}
            </ButtonMain>
          </>
        ) : (
          <TelegramRecoveryPanel nextPath={nextPath} />
        )}
      </AuthFormShell>
    );
  }

  if (exchanging) return <LoaderMain label={t('passwordRecovery.reset.checkingLink')} />;

  if (!ready) {
    return (
      <AuthFormShell
        onSubmit={(event) => event.preventDefault()}
        title={t('passwordRecovery.invalid.title')}
        subtitle={t('passwordRecovery.invalid.subtitle')}
      >
        {error ? (
          <FeedbackText tone="error">
            {'localized' in error ? error.localized : translateError(tErrors, error)}
          </FeedbackText>
        ) : null}
        <Link className={styles['primary-link']} href={routes.forgotPassword}>
          {t('passwordRecovery.invalid.action.restart')}
        </Link>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell onSubmit={onReset} title={t('passwordRecovery.reset.title')}>
      <input
        type="text"
        name="username"
        value=""
        autoComplete="username"
        readOnly
        hidden
        aria-hidden="true"
        tabIndex={-1}
      />
      <PasswordInput
        id="recovery-password"
        label={t('passwordRecovery.reset.field.newPassword')}
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
        label={t('passwordRecovery.reset.field.confirmPassword')}
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
      {error ? (
        <FeedbackText tone="error">
          {'localized' in error ? error.localized : translateError(tErrors, error)}
        </FeedbackText>
      ) : null}
      <ButtonMain type="submit" fullWidth loading={busy} disabled={resetDisabled}>
        {t('passwordRecovery.reset.action.save')}
      </ButtonMain>
    </AuthFormShell>
  );
}
