'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export function SignInForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
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
    // If 2FA is not required and login succeeded, go to profile.
    if (signInThunk.fulfilled.match(res) && !res.payload.needTwoFactor) {
      router.push('/profile/edit');
    }
  };

  const onSubmit2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;
    setBusy(true);
    const res = await dispatch(signInTwoFactorThunk({ twoFactorToken, code }));
    setBusy(false);
    if (signInTwoFactorThunk.fulfilled.match(res)) router.push('/profile/edit');
  };

  if (twoFactorToken) {
    return (
      <form onSubmit={onSubmit2fa} className="card" style={{ maxWidth: 380, margin: '0 auto' }}>
        <h2>Two-factor code</h2>
        <p className="muted">Enter the 6-digit code from your authenticator app.</p>
        <InputMain
          label="Authenticator code"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          autoFocus
        />
        {error && <p className="error-text">{error}</p>}
        <ButtonMain type="submit" fullWidth loading={busy}>
          Verify
        </ButtonMain>
        <ButtonMain
          variant="ghost"
          fullWidth
          style={{ marginTop: 8 }}
          onClick={() => dispatch(resetTwoFactor())}
          type="button"
        >
          Back
        </ButtonMain>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 380, margin: '0 auto' }}>
      <h2>Sign in</h2>
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
      {error && <p className="error-text">{error}</p>}
      <ButtonMain type="submit" fullWidth loading={busy}>
        Sign in
      </ButtonMain>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        <GithubLoginButton />
        <TelegramLoginButton />
      </div>

      <div style={{ marginTop: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
        <Link href="/sign-up">Create account</Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
