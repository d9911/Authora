'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import {
  clearAuthError,
  resetTwoFactor,
  signInThunk,
  signInTwoFactorThunk,
} from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain } from '@/shared/ui';
import { GithubLoginButton } from '@/features/GithubLoginButton/GithubLoginButton';
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import styles from './SignInForm.module.scss';

export function SignInForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to go after a successful sign-in (set by middleware via ?next=).
  const nextPath = searchParams.get('next') || '/profile/edit';
  const { error, twoFactorToken } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    dispatch(clearAuthError());
    const res = await dispatch(signInThunk({ email, password }));
    setBusy(false);
    // If 2FA is not required and sign-in succeeded, go to the next page.
    if (signInThunk.fulfilled.match(res) && !res.payload.needTwoFactor) {
      router.push(nextPath);
    }
  };

  const onSubmit2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setBusy(true);
    const res = await dispatch(signInTwoFactorThunk({ twoFactorToken, code }));
    setBusy(false);
    if (signInTwoFactorThunk.fulfilled.match(res)) router.push(nextPath);
  };

  if (twoFactorToken) {
    return (
      <div className={styles['auth-wrapper']}>
        <form onSubmit={onSubmit2fa} className={styles['auth-card']}>
          <div className={styles['auth-header']}>
            <h2 className={styles['auth-title']}>Two-factor code</h2>
            <p className={styles['auth-subtitle']}>
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <div className={styles['auth-form']}>
            <InputMain
              label="Authenticator code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
            />
            {error && <div className={styles['auth-error']}>{error}</div>}
            <ButtonMain type="submit" fullWidth loading={busy}>
              Verify
            </ButtonMain>
            <ButtonMain
              variant="ghost"
              fullWidth
              onClick={() => dispatch(resetTwoFactor())}
              type="button"
            >
              Back
            </ButtonMain>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles['auth-wrapper']}>
      <form onSubmit={onSubmit} className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <span className="eyebrow">Welcome back</span>
          <h2 className={styles['auth-title']}>Sign in</h2>
        </div>
        <div className={styles['auth-form']}>
          <InputMain
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <InputMain
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <div className={styles['auth-error']}>{error}</div>}
          <ButtonMain type="submit" fullWidth loading={busy}>
            Sign in
          </ButtonMain>

          <div className={styles['auth-divider']}>or</div>

          <div className={styles['oauth-buttons']}>
            <GithubLoginButton />
            <TelegramLoginButton />
          </div>
        </div>

        <div className={styles['auth-footer']}>
          <Link href="/sign-up">Create account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </form>
    </div>
  );
}
