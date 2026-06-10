'use client';

import { useState } from 'react';
import {
  confirmTwoFactor,
  disableTwoFactor,
  enableTwoFactor,
} from '@/features/auth-api/authApi';
import { ButtonMain, InputMain } from '@/shared/ui';
import { useAppSelector } from '@/shared/hooks/redux';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

export function TwoFactorSetup() {
  const { user } = useAppSelector((s) => s.auth);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleErr = (e: unknown) =>
    setErr(e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error');

  const onEnable = async () => {
    setErr(null);
    setBusy(true);
    try {
      const setup = await enableTwoFactor();
      setQr(setup.qrDataUrl);
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setErr(null);
    setBusy(true);
    try {
      await confirmTwoFactor(code);
      setEnabled(true);
      setQr(null);
      setMsg('Two-factor authentication enabled ✓');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    setErr(null);
    setBusy(true);
    try {
      await disableTwoFactor(code);
      setEnabled(false);
      setMsg('Two-factor authentication disabled');
      setCode('');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Two-factor authentication</h2>
      <p className="muted">
        Status: {enabled ? <strong style={{ color: 'var(--success)' }}>Enabled</strong> : 'Disabled'}
      </p>

      {!enabled && !qr && (
        <ButtonMain onClick={onEnable} loading={busy}>
          Enable 2FA
        </ButtonMain>
      )}

      {qr && (
        <div>
          <p>Scan this QR code with Google Authenticator or Authy:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" style={{ width: 180, height: 180 }} />
          <InputMain
            label="Enter the code to confirm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <ButtonMain onClick={onConfirm} loading={busy}>
            Confirm
          </ButtonMain>
        </div>
      )}

      {enabled && (
        <div style={{ marginTop: 12 }}>
          <InputMain
            label="Enter a code to disable 2FA"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <ButtonMain variant="danger" onClick={onDisable} loading={busy}>
            Disable 2FA
          </ButtonMain>
        </div>
      )}

      {err && <p className="error-text">{err}</p>}
      {msg && <p className="success-text">{msg}</p>}
    </div>
  );
}
