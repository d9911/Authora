'use client';

import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { ROUTES, safeNextPath } from '@/shared/lib/routes';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import styles from '@/features/AuthForm/AuthForm.module.scss';

export function SignInForm() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const recovered = searchParams.get('recovered') === '1';
  const forgotPasswordHref = `${ROUTES.forgotPassword}?next=${encodeURIComponent(nextPath)}`;
  const { error, twoFactorToken } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [busy, setBusy] = useState(false);

  const completeAuthRedirect = async () => {
    await dispatch(loadMeThunk());
    window.location.replace(nextPath);
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
        title="Two-factor code"
        subtitle={
          useRecoveryCode
            ? 'Enter one of the recovery codes saved when 2FA was enabled.'
            : 'Enter the 6-digit code from your authenticator app.'
        }
      >
        {useRecoveryCode ? (
          <InputMain
            label="Recovery code"
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
            label="Authenticator code"
            value={code}
            onValueChange={setCode}
            onComplete={(value) => void submitTwoFactorCode(value)}
            placeholder="123456"
            autoFocus
          />
        )}
        {error && <div className={styles['auth-error']}>{error}</div>}
        <ButtonMain type="submit" fullWidth loading={busy}>
          Verify
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
          {useRecoveryCode ? 'Use authenticator code' : 'Use recovery code'}
        </ButtonMain>
        <ButtonMain
          variant="ghost"
          fullWidth
          onClick={() => dispatch(resetTwoFactor())}
          type="button"
        >
          Back
        </ButtonMain>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow="Welcome back"
      title="Sign in"
      footer={
        <>
          <div className={styles['auth-register-panel']}>
            <span>New to Authora?</span>
            <Link className={styles['auth-register-link']} href={ROUTES.signUp}>
              Create account
            </Link>
          </div>
          <div className={styles['auth-footer']}>
            <Link href={forgotPasswordHref}>Forgot password?</Link>
          </div>
        </>
      }
    >
      <InputMain
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <PasswordInput
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {recovered ? (
        <FeedbackText tone="success" role="status" aria-live="polite">
          Пароль изменён. Войдите с новым паролем.
        </FeedbackText>
      ) : null}
      {error && <div className={styles['auth-error']}>{error}</div>}
      <ButtonMain type="submit" fullWidth loading={busy}>
        Sign in
      </ButtonMain>
      <div className={styles['auth-divider']}>or</div>
      <div className={styles['oauth-buttons']}>
        <GithubLoginButton />
        <TelegramLoginButton />
      </div>
    </AuthFormShell>
  );
}
