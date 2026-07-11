'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks';
import {
  clearAuthError,
  loadMeThunk,
  resetTwoFactor,
  signInThunk,
  signInTwoFactorThunk,
} from '@/processes/store/slices/authSlice';
import { ButtonMain, FeedbackText, InputMain, OtpCodeInput, PasswordInput } from '@/shared/ui';
import { GithubLoginButton } from '@/features/GithubLoginButton/GithubLoginButton';
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import { normalizeNumericCode } from '@/shared/lib/otp';
import {
  getLocalizedRoutes,
  getPostAuthRedirectPath,
  safeNextPath,
} from '@/shared/lib/routes';
import { config } from '@/shared/config';
import { translateError, useCurrentLocale } from '@/shared/i18n';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import styles from '@/features/AuthForm/AuthForm.module.scss';

export function SignInForm() {
  const { t } = useTranslation('auth');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get('next');
  const nextPath = safeNextPath(requestedNextPath, routes.profileEdit);
  const recovered = searchParams.get('recovered') === '1';
  const forgotPasswordHref = `${routes.forgotPassword}?next=${encodeURIComponent(nextPath)}`;
  const { error, errorCode, twoFactorToken } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const completeAuthRedirect = async () => {
    await dispatch(loadMeThunk());
    window.location.replace(
      getPostAuthRedirectPath(
        requestedNextPath,
        routes.profileEdit,
        window.location.hash,
      ),
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    dispatch(clearAuthError());
    try {
      const res = await dispatch(signInThunk({ email, password }));
      if (signInThunk.fulfilled.match(res) && !res.payload.needTwoFactor) {
        await completeAuthRedirect();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitTwoFactorCode = async (nextCode = code) => {
    const submittedCode = useRecoveryCode ? nextCode.trim() : normalizeNumericCode(nextCode);
    if (!twoFactorToken || !submittedCode || busy) return;
    setBusy(true);
    try {
      const res = await dispatch(
        signInTwoFactorThunk({ twoFactorToken, code: submittedCode }),
      );
      if (signInTwoFactorThunk.fulfilled.match(res)) await completeAuthRedirect();
    } finally {
      setBusy(false);
    }
  };

  const onSubmit2fa = (e: FormEvent) => {
    e.preventDefault();
    void submitTwoFactorCode();
  };

  if (twoFactorToken) {
    return (
      <AuthFormShell
        onSubmit={onSubmit2fa}
        title={t('signIn.twoFactor.title')}
        subtitle={
          useRecoveryCode
            ? t('signIn.twoFactor.recoverySubtitle')
            : t('signIn.twoFactor.authenticatorSubtitle')
        }
      >
        {useRecoveryCode ? (
          <InputMain
            label={t('signIn.twoFactor.recoveryCodeLabel')}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-JKLM"
            autoComplete="one-time-code"
            spellCheck={false}
            mono
            autoFocus
          />
        ) : (
          <OtpCodeInput
            label={t('signIn.twoFactor.authenticatorCodeLabel')}
            value={code}
            onValueChange={setCode}
            onComplete={(value) => void submitTwoFactorCode(value)}
            placeholder="123456"
            autoFocus
          />
        )}
        {error && (
          <div className={styles['auth-error']}>
            {translateError(tErrors, { code: errorCode, message: error })}
          </div>
        )}
        <ButtonMain type="submit" fullWidth loading={busy}>
          {t('signIn.twoFactor.verify')}
        </ButtonMain>
        <ButtonMain
          variant="ghost"
          fullWidth
          onClick={() => {
            setUseRecoveryCode((current) => !current);
            setCode('');
            dispatch(clearAuthError());
          }}
          type="button"
        >
          {useRecoveryCode
            ? t('signIn.twoFactor.useAuthenticatorCode')
            : t('signIn.twoFactor.useRecoveryCode')}
        </ButtonMain>
        <ButtonMain
          variant="ghost"
          fullWidth
          onClick={() => dispatch(resetTwoFactor())}
          type="button"
        >
          {t('signIn.twoFactor.back')}
        </ButtonMain>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow={t('signIn.eyebrow')}
      title={t('signIn.title')}
      footer={
        <>
          <div className={styles['auth-register-panel']}>
            <span>{t('signIn.newUserPrompt', { appName: config.appName })}</span>
            <Link className={styles['auth-register-link']} href={routes.signUp}>
              {t('signIn.createAccount')}
            </Link>
          </div>
          <div className={styles['auth-footer']}>
            <Link
              href={forgotPasswordHref}
              onClick={(event) => {
                const nextWithHash = getPostAuthRedirectPath(
                  requestedNextPath,
                  routes.profileEdit,
                  window.location.hash,
                );
                if (nextWithHash === nextPath) return;
                event.preventDefault();
                window.location.assign(
                  `${routes.forgotPassword}?next=${encodeURIComponent(nextWithHash)}`,
                );
              }}
            >
              {t('signIn.forgotPassword')}
            </Link>
          </div>
        </>
      }
    >
      <InputMain
        label={t('signIn.fields.email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <PasswordInput
        label={t('signIn.fields.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {recovered ? (
        <FeedbackText tone="success" role="status" aria-live="polite">
          {t('signIn.passwordRecovered')}
        </FeedbackText>
      ) : null}
      {error && (
        <div className={styles['auth-error']}>
          {translateError(tErrors, { code: errorCode, message: error })}
        </div>
      )}
      <ButtonMain type="submit" fullWidth loading={busy}>
        {t('signIn.submit')}
      </ButtonMain>
      <div className={styles['auth-divider']}>{t('signIn.dividerOr')}</div>
      <div className={styles['oauth-buttons']}>
        <GithubLoginButton />
        <TelegramLoginButton />
      </div>
    </AuthFormShell>
  );
}
