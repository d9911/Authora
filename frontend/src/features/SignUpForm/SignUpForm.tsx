'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { clearAuthError, signUpThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain } from '@/shared/ui';

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
    if (signUpThunk.fulfilled.match(res)) router.push('/profile/edit');
  };

  return (
    <form onSubmit={onSubmit} className="card" style={{ maxWidth: 380, margin: '0 auto' }}>
      <h2>Create account</h2>
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
      {(localError || error) && <p className="error-text">{localError || error}</p>}
      <ButtonMain type="submit" fullWidth loading={busy}>
        Sign up
      </ButtonMain>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
        After signing up, check your email to confirm your address.
      </p>
      <div style={{ marginTop: 8, fontSize: 14 }}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </div>
    </form>
  );
}
