'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  confirmTwoFactor,
  disableTwoFactor,
  enableTwoFactor,
} from '@/features/auth-api/authApi';
import { ButtonMain, FeedbackText, OtpCodeInput } from '@/shared/ui';
import { useAppSelector } from '@/processes/store/hooks';
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors';
import { translateError } from '@/shared/i18n';
import styles from './TwoFactorSetup.module.scss';

export function TwoFactorSetup() {
  const { t } = useTranslation('auth');
  const { t: tErrors } = useTranslation('errors');
  const { user } = useAppSelector((s) => s.auth);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<ErrorDescriptor | { localized: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleErr = (error: unknown) => setErr(getErrorDescriptor(error));

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
      setMsg(t('twoFactor.message.enabled'));
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
      setMsg(t('twoFactor.message.disabled'));
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
      setMsg(t('twoFactor.message.recoveryCodesCopied'));
    } catch {
      setErr({ localized: t('twoFactor.error.copyFailed') });
    }
  };

  return (
    <div className="card">
      <h2>{t('twoFactor.title')}</h2>
      <p className="muted">
        {t('twoFactor.status.label')}{' '}
        {enabled ? (
          <strong style={{ color: 'var(--signal)' }}>{t('twoFactor.status.enabled')}</strong>
        ) : (
          t('twoFactor.status.disabled')
        )}
      </p>

      {!enabled && !qr && (
        <ButtonMain onClick={onEnable} loading={busy}>
          {t('twoFactor.action.enable')}
        </ButtonMain>
      )}

      {qr && (
        <div className={styles.setup}>
          <p>{t('twoFactor.setup.scanQr')}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={t('twoFactor.setup.qrAlt')} style={{ width: 180, height: 180 }} />
          <OtpCodeInput
            label={t('twoFactor.setup.confirmCodeLabel')}
            value={code}
            onValueChange={setCode}
            placeholder="123456"
          />
          <ButtonMain onClick={onConfirm} loading={busy}>
            {t('twoFactor.action.confirm')}
          </ButtonMain>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <section className={styles.recovery} aria-labelledby="two-factor-recovery-title">
          <h3 id="two-factor-recovery-title">{t('twoFactor.recovery.title')}</h3>
          <p className="muted">
            {t('twoFactor.recovery.description')}
          </p>
          <ul className={styles.codes} aria-label={t('twoFactor.recovery.ariaLabel')}>
            {recoveryCodes.map((recoveryCode) => (
              <li key={recoveryCode}>{recoveryCode}</li>
            ))}
          </ul>
          <p className="muted">
            {t('twoFactor.recovery.remainingCodes', { count: recoveryCodes.length })}
          </p>
          <div className={styles.actions}>
            <ButtonMain type="button" variant="secondary" onClick={copyRecoveryCodes}>
              {t('twoFactor.action.copyCodes')}
            </ButtonMain>
            {enabled ? (
              <ButtonMain type="button" variant="ghost" onClick={() => setRecoveryCodes([])}>
                {t('twoFactor.action.codesSaved')}
              </ButtonMain>
            ) : null}
          </div>
        </section>
      )}

      {enabled && (
        <div style={{ marginTop: 12 }}>
          <OtpCodeInput
            label={t('twoFactor.disableCodeLabel')}
            value={code}
            onValueChange={setCode}
            placeholder="123456"
          />
          <ButtonMain variant="danger" onClick={onDisable} loading={busy}>
            {t('twoFactor.action.disable')}
          </ButtonMain>
        </div>
      )}

      {err && (
        <FeedbackText tone="error">
          {'localized' in err ? err.localized : translateError(tErrors, err)}
        </FeedbackText>
      )}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}
    </div>
  );
}
