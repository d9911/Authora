'use client';

import { FormEvent, useState } from 'react';
import { requestPasswordReset, resetPassword } from '@/features/auth-api/authApi';
import { ButtonMain, InputMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';

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
      setErr(handle(e2));
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
      setErr(handle(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={isReset ? onReset : onRequest}
      className="card"
      style={{ maxWidth: 380, margin: '0 auto' }}
    >
      <h2>{isReset ? 'Set new password' : 'Reset password'}</h2>
      {isReset ? (
        <InputMain
          label="New password"
          type="password"
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
      {err && <p className="error-text">{err}</p>}
      {msg && <p className="success-text">{msg}</p>}
      <ButtonMain type="submit" fullWidth loading={busy}>
        {isReset ? 'Update password' : 'Send reset link'}
      </ButtonMain>
    </form>
  );
}
