'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import {
  clearAuthError,
  loadMeThunk,
  resetTwoFactor,
  signInThunk,
  signInTwoFactorThunk,
} from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain } from '@/shared/ui';
import { GithubLoginButton } from '@/features/GithubLoginButton/GithubLoginButton';
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import styles from './SignInForm.module.scss';

const DEFAULT_NEXT_PATH = '/profile/edit';
const AUTO_CODE_LENGTH = 6;

function normalizeCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, AUTO_CODE_LENGTH);
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return DEFAULT_NEXT_PATH;

  try {
    const url = new URL(value, 'http://authora.local');
    if (url.origin !== 'http://authora.local') return DEFAULT_NEXT_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

export function SignInForm() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  // Where to go after a successful sign-in (set by middleware via ?next=).
  const nextPath = safeNextPath(searchParams.get('next'));
  const { error, twoFactorToken } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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
      // If 2FA is not required and sign-in succeeded, go to the next page.
      if (signInThunk.fulfilled.match(res) && !res.payload.needTwoFactor) {
        await completeAuthRedirect();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitTwoFactorCode = async (nextCode = code) => {
    const normalized = normalizeCode(nextCode);
    if (!twoFactorToken || !normalized || busy) return;
    setBusy(true);
    try {
      const res = await dispatch(signInTwoFactorThunk({ twoFactorToken, code: normalized }));
      if (signInTwoFactorThunk.fulfilled.match(res)) await completeAuthRedirect();
    } finally {
      setBusy(false);
    }
  };

  const onSubmit2fa = (e: FormEvent) => {
    e.preventDefault();
    void submitTwoFactorCode();
  };

  const handleTwoFactorCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeCode(e.target.value);
    setCode(normalized);
    if (normalized.length === AUTO_CODE_LENGTH) void submitTwoFactorCode(normalized);
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
              onChange={handleTwoFactorCodeChange}
              placeholder="123456"
              maxLength={AUTO_CODE_LENGTH}
              autoComplete="one-time-code"
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

        <div className={styles['auth-register-panel']}>
          <span>New to Authora?</span>
          <Link className={styles['auth-register-link']} href="/sign-up">
            Create account
          </Link>
        </div>

        <div className={styles['auth-footer']}>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </form>
    </div>
  );
}
