'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { confirmEmailCode, resendEmailCode } from '@/features/auth-api/authApi';
import { ButtonMain, InputMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';
import { useAppDispatch } from '@/shared/hooks/redux';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';
const AUTO_CODE_LENGTH = 6;

function normalizeCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, AUTO_CODE_LENGTH);
}

export function ConfirmEmailForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
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

  const submitCode = async (nextCode = code) => {
    const normalized = normalizeCode(nextCode);
    if (busy) return;
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (normalized.length !== AUTO_CODE_LENGTH) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      await confirmEmailCode(email.trim(), normalized);
      await dispatch(loadMeThunk());
      setMsg('Email confirmed ✓ Redirecting…');
      router.replace('/');
    } catch (e) {
      setError(handle(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    void submitCode();
  };

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeCode(e.target.value);
    setCode(normalized);
    if (normalized.length === AUTO_CODE_LENGTH) void submitCode(normalized);
  };

  const onResend = async () => {
    setError(null);
    setMsg(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setResending(true);
    try {
      await resendEmailCode(email.trim());
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
        onChange={handleCodeChange}
        placeholder="123456"
        maxLength={AUTO_CODE_LENGTH}
        autoComplete="one-time-code"
        required
        autoFocus
      />

      {error && <p className="error-text">{error}</p>}
      {msg && <p className="success-text">{msg}</p>}

      <div
        className="confirm-actions"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}
      >
        <ButtonMain type="submit" fullWidth loading={busy} disabled={code.length !== AUTO_CODE_LENGTH}>
          Confirm
        </ButtonMain>

        <ButtonMain
          type="button"
          variant="ghost"
          fullWidth
          loading={resending}
          onClick={onResend}
        >
          Resend code
        </ButtonMain>
      </div>
    </form>
  );
}
