'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmEmailCode, resendEmailCode } from '@/features/auth-api/authApi';
import { ButtonMain, InputMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';

export function ConfirmEmailForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const e = params.get('email');
    if (e) setEmail(e);
  }, [params]);

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      await confirmEmailCode(email, code.trim());
      setMsg('Email confirmed ✓ Redirecting…');
      setTimeout(() => router.push('/profile/edit'), 900);
    } catch (e) {
      setError(handle(e));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setMsg(null);
    setResending(true);
    try {
      await resendEmailCode(email);
      setMsg('A new code has been sent to your email.');
    } catch (e) {
      setError(handle(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="auth-card">
      <span className="eyebrow">Verify</span>
      <h2 style={{ marginTop: 10 }}>Confirm your email</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        We sent a 6-digit code to <strong>{email || 'your email'}</strong>. Enter it below.
      </p>

      {!params.get('email') && (
        <InputMain
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      )}

      <InputMain
        label="Confirmation code"
        inputMode="numeric"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        maxLength={6}
        required
        autoFocus
      />

      {error && <p className="error-text">{error}</p>}
      {msg && <p className="success-text">{msg}</p>}

      <ButtonMain type="submit" fullWidth loading={busy}>
        Confirm
      </ButtonMain>

      <ButtonMain
        type="button"
        variant="ghost"
        fullWidth
        style={{ marginTop: 8 }}
        loading={resending}
        onClick={onResend}
      >
        Resend code
      </ButtonMain>
    </form>
  );
}
