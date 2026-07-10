'use client';

import { useState } from 'react';
import {
  confirmTwoFactor,
  disableTwoFactor,
  enableTwoFactor,
} from '@/features/auth-api/authApi';
import { ButtonMain, FeedbackText, OtpCodeInput } from '@/shared/ui';
import { useAppSelector } from '@/processes/store/hooks';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';
import styles from './TwoFactorSetup.module.scss';

export function TwoFactorSetup() {
  const { user } = useAppSelector((s) => s.auth);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
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
      setRecoveryCodes(setup.recoveryCodes);
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
      setRecoveryCodes([]);
      setMsg('Two-factor authentication disabled');
      setCode('');
    } catch (e) {
      handleErr(e);
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setMsg('Recovery codes copied');
    } catch {
      setErr('Could not copy recovery codes. Select and save them manually.');
    }
  };

  return (
    <div className="card">
      <h2>Two-factor authentication</h2>
      <p className="muted">
        Status: {enabled ? <strong style={{ color: 'var(--signal)' }}>Enabled</strong> : 'Disabled'}
      </p>

      {!enabled && !qr && (
        <ButtonMain onClick={onEnable} loading={busy}>
          Enable 2FA
        </ButtonMain>
      )}

      {qr && (
        <div className={styles.setup}>
          <p>Scan this QR code with Google Authenticator or Authy:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" style={{ width: 180, height: 180 }} />
          <OtpCodeInput
            label="Enter the code to confirm"
            value={code}
            onValueChange={setCode}
            placeholder="123456"
          />
          <ButtonMain onClick={onConfirm} loading={busy}>
            Confirm
          </ButtonMain>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <section className={styles.recovery} aria-labelledby="two-factor-recovery-title">
          <h3 id="two-factor-recovery-title">Recovery codes</h3>
          <p className="muted">
            Save these one-time codes now. They will not be shown again after this page.
          </p>
          <ul className={styles.codes} aria-label="Two-factor recovery codes">
            {recoveryCodes.map((recoveryCode) => (
              <li key={recoveryCode}>{recoveryCode}</li>
            ))}
          </ul>
          <div className={styles.actions}>
            <ButtonMain type="button" variant="secondary" onClick={copyRecoveryCodes}>
              Copy all codes
            </ButtonMain>
            {enabled ? (
              <ButtonMain type="button" variant="ghost" onClick={() => setRecoveryCodes([])}>
                I saved these codes
              </ButtonMain>
            ) : null}
          </div>
        </section>
      )}

      {enabled && (
        <div style={{ marginTop: 12 }}>
          <OtpCodeInput
            label="Enter a code to disable 2FA"
            value={code}
            onValueChange={setCode}
            placeholder="123456"
          />
          <ButtonMain variant="danger" onClick={onDisable} loading={busy}>
            Disable 2FA
          </ButtonMain>
        </div>
      )}

      {err && <FeedbackText tone="error">{err}</FeedbackText>}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}
    </div>
  );
}
