'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { confirmEmailCode, resendEmailCode } from '@/features/auth-api/authApi';
import { ButtonMain, FeedbackText, InputMain, OtpCodeInput } from '@/shared/ui';
import { useAppDispatch } from '@/processes/store/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { DEFAULT_OTP_LENGTH, normalizeNumericCode } from '@/shared/lib/otp';
import { ROUTES } from '@/shared/lib/routes';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';

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
    const normalized = normalizeNumericCode(nextCode);
    if (busy) return;
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (normalized.length !== DEFAULT_OTP_LENGTH) {
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
      router.replace(ROUTES.home);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    void submitCode();
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
      setError(getErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow="Verify"
      title="Confirm your email"
      subtitle={
        <>
          We sent a 6-digit code to <strong>{email || 'your email'}</strong>. Enter it below.
        </>
      }
    >
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

      <OtpCodeInput
        label="Confirmation code"
        value={code}
        onValueChange={setCode}
        onComplete={(value) => void submitCode(value)}
        placeholder="123456"
        required
        autoFocus
      />

      {error && <FeedbackText tone="error">{error}</FeedbackText>}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}

      <div
        className="confirm-actions"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}
      >
        <ButtonMain type="submit" fullWidth loading={busy} disabled={code.length !== DEFAULT_OTP_LENGTH}>
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
    </AuthFormShell>
  );
}
