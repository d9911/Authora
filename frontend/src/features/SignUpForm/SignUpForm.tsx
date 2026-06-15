'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { clearAuthError, signUpThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain } from '@/shared/ui';
import styles from '../SignInForm/SignInForm.module.scss';

export function SignUpForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error } = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    dispatch(clearAuthError());
    const res = await dispatch(signUpThunk({ email, password, name: name || undefined }));
    setBusy(false);
    // After sign-up the email is not yet verified — send the user to the
    // code-entry page (a 6-digit code was emailed to them).
    if (signUpThunk.fulfilled.match(res)) {
      router.push(`/confirm-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <div className={styles['auth-wrapper']}>
      <form onSubmit={onSubmit} className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <span className="eyebrow">New identity</span>
          <h2 className={styles['auth-title']}>Create account</h2>
        </div>
        <div className={styles['auth-form']}>
          <InputMain label="Name" value={name} onChange={(e) => setName(e.target.value)} />
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
            autoComplete="new-password"
          />
          {(localError || error) && (
            <div className={styles['auth-error']}>{localError || error}</div>
          )}
          <ButtonMain type="submit" fullWidth loading={busy}>
            Sign up
          </ButtonMain>
          <p className={styles['auth-subtitle']} style={{ marginTop: 12 }}>
            After signing up, check your email to confirm your address.
          </p>
        </div>
        <div className={styles['auth-footer']}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
