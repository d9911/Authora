'use client';

import { FormEvent, useState } from 'react';
import { requestPasswordReset, resetPassword } from '@/features/auth-api/authApi';
import { ButtonMain, FeedbackText, InputMain, PasswordInput } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/errors';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';

/** mode="request": ask for email. mode="reset": set a new password with a token. */
export function PasswordResetForm({ token }: { token?: string }) {
  const isReset = Boolean(token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onRequest = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await requestPasswordReset(email);
      setMsg('If that email exists, a reset link has been sent.');
    } catch (e2) {
      setErr(getErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await resetPassword(token!, password);
      setMsg('Password updated. You can now sign in.');
    } catch (e2) {
      setErr(getErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFormShell
      onSubmit={isReset ? onReset : onRequest}
      title={isReset ? 'Set new password' : 'Reset password'}
    >
      {isReset ? (
        <PasswordInput
          label="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      ) : (
        <InputMain
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      )}
      {err && <FeedbackText tone="error">{err}</FeedbackText>}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}
      <ButtonMain type="submit" fullWidth loading={busy}>
        {isReset ? 'Update password' : 'Send reset link'}
      </ButtonMain>
    </AuthFormShell>
  );
}
