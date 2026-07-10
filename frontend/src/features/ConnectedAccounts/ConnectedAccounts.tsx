'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import {
  confirmEmailCode,
  getOAuthLinkToken,
  resendEmailCode,
  unlinkProvider,
} from '@/features/auth-api/authApi';
import {
  confirmEmailChange,
  requestEmailChange,
} from './api/accountSecurityApi';
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import { ButtonMain, FeedbackText, InputMain, OtpCodeInput } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/errors';
import { normalizeNumericCode } from '@/shared/lib/otp';
import { ROUTES } from '@/shared/lib/routes';

type Provider = 'github' | 'telegram';
type BusyAction =
  | Provider
  | 'email-send'
  | 'email-confirm'
  | 'email-change-request'
  | 'email-change-confirm';

function ConnectedAccountRow({
  label,
  connected,
  connectedLabel = 'Connected',
  missingLabel = 'Not connected',
  detail,
  children,
}: {
  label: string;
  connected: boolean;
  connectedLabel?: string;
  missingLabel?: string;
  detail?: string | null;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div>
        <strong>{label}</strong>{' '}
        {connected ? (
          <span className="tag tag-verified" style={{ marginLeft: 6 }}>
            {connectedLabel}
          </span>
        ) : (
          <span className="muted" style={{ marginLeft: 6, fontSize: 13 }}>
            {missingLabel}
          </span>
        )}
        {detail && (
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {detail}
          </div>
        )}
      </div>
      <div
        style={{
          minWidth: 180,
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ConnectedAccounts() {
  const dispatch = useAppDispatch();
  const params = useSearchParams();
  const { user } = useAppSelector((s) => s.auth);

  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailRequested, setEmailRequested] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeMode, setEmailChangeMode] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Confirmation when returning from a GitHub link (?linked=github).
  useEffect(() => {
    const linked = params.get('linked');
    if (linked === 'github' || linked === 'telegram') {
      setMsg(`${linked === 'github' ? 'GitHub' : 'Telegram'} account linked ✓`);
      void dispatch(loadMeThunk());
    }
  }, [params, dispatch]);

  // GitHub linking = full-page redirect to the backend with a link token.
  const startGithubLink = async () => {
    setError(null);
    setMsg(null);
    setBusy('github');
    try {
      const token = await getOAuthLinkToken();
      window.location.href = `${config.backendPublicUrl}/api/auth/github?link=${encodeURIComponent(token)}`;
    } catch (e) {
      setError(getErrorMessage(e));
      setBusy(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    setError(null);
    setMsg(null);
    setBusy(provider);
    try {
      await unlinkProvider(provider);
      await dispatch(loadMeThunk());
      setMsg(`${provider === 'github' ? 'GitHub' : 'Telegram'} disconnected`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const requestEmailCode = async () => {
    if (!user?.email) {
      setError('User email is not loaded yet.');
      return;
    }
    setError(null);
    setMsg(null);
    setBusy('email-send');
    try {
      await resendEmailCode(user.email);
      setEmailRequested(true);
      setMsg(`Confirmation code sent to ${user.email}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const submitEmailCode = async (nextCode = emailCode) => {
    if (!user?.email) {
      setError('User email is not loaded yet.');
      return;
    }
    const code = normalizeNumericCode(nextCode);
    if (busy) return;
    if (!code) {
      setError('Enter the confirmation code from your email.');
      return;
    }
    setError(null);
    setMsg(null);
    setBusy('email-confirm');
    try {
      await confirmEmailCode(user.email, code);
      setEmailCode('');
      setEmailRequested(false);
      await dispatch(loadMeThunk());
      setMsg('Email confirmed ✓');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmEmail = async (ev: FormEvent) => {
    ev.preventDefault();
    await submitEmailCode();
  };

  const requestNewEmail = async () => {
    if (!newEmail.trim()) {
      setError('Введите новый email.');
      return;
    }
    setError(null);
    setMsg(null);
    setBusy('email-change-request');
    try {
      await requestEmailChange(newEmail.trim());
      setEmailChangeRequested(true);
      setMsg(`Код подтверждения отправлен на ${newEmail.trim()}`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(null);
    }
  };

  const submitEmailChangeCode = async (nextCode = emailCode) => {
    const code = normalizeNumericCode(nextCode);
    if (!code || busy) return;
    setError(null);
    setMsg(null);
    setBusy('email-change-confirm');
    try {
      await confirmEmailChange(code);
      setEmailCode('');
      setNewEmail('');
      setEmailChangeMode(false);
      setEmailChangeRequested(false);
      await dispatch(loadMeThunk());
      setMsg('Email для входа и восстановления подтверждён.');
    } catch (confirmError) {
      setError(getErrorMessage(confirmError));
    } finally {
      setBusy(null);
    }
  };

  const confirmNewEmail = async (event: FormEvent) => {
    event.preventDefault();
    await submitEmailChangeCode();
  };

  const emailVerified = Boolean(user?.emailVerified);
  const githubConnected = Boolean(user?.githubId);
  const telegramConnected = Boolean(user?.telegramId);
  const changingEmail = !user?.email || emailChangeMode;
  const recoveryMethods = user?.recoveryMethods ?? [];
  const recoveryLabel = recoveryMethods.length
    ? recoveryMethods.map((method) => (method === 'EMAIL' ? 'Email' : 'Telegram')).join(', ')
    : 'No recovery method configured';

  return (
    <div className="card">
      <h2>Connected accounts</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Link external accounts to sign in with one click.
      </p>

      <ConnectedAccountRow
        label="Email"
        connected={emailVerified}
        connectedLabel="Verified"
        missingLabel={emailRequested ? 'Code sent' : 'Not verified'}
        detail={user?.email}
      >
        {changingEmail ? (
          <form
            onSubmit={confirmNewEmail}
            style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}
          >
            <InputMain
              aria-label="New recovery email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              disabled={emailChangeRequested}
              style={{ width: 190 }}
            />
            {emailChangeRequested ? (
              <OtpCodeInput
                aria-label="New email confirmation code"
                value={emailCode}
                onValueChange={setEmailCode}
                onComplete={(value) => void submitEmailChangeCode(value)}
                placeholder="Code"
                mono
                style={{ width: 112 }}
              />
            ) : null}
            <ButtonMain
              type={emailChangeRequested ? 'submit' : 'button'}
              size="small"
              loading={
                busy === 'email-change-request' || busy === 'email-change-confirm'
              }
              disabled={emailChangeRequested ? !emailCode.trim() : !newEmail.trim()}
              onClick={emailChangeRequested ? undefined : requestNewEmail}
            >
              {emailChangeRequested ? 'Confirm email' : 'Send code'}
            </ButtonMain>
            {user?.email ? (
              <ButtonMain
                type="button"
                size="small"
                variant="ghost"
                onClick={() => {
                  setEmailChangeMode(false);
                  setEmailChangeRequested(false);
                  setNewEmail('');
                  setEmailCode('');
                }}
              >
                Cancel
              </ButtonMain>
            ) : null}
          </form>
        ) : emailVerified ? (
          <ButtonMain
            type="button"
            size="small"
            variant="secondary"
            onClick={() => setEmailChangeMode(true)}
          >
            Change email
          </ButtonMain>
        ) : (
          <form
            onSubmit={confirmEmail}
            style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}
          >
            <OtpCodeInput
              aria-label="Email confirmation code"
              value={emailCode}
              onValueChange={setEmailCode}
              onComplete={(value) => void submitEmailCode(value)}
              placeholder="Code"
              mono
              style={{ width: 112 }}
            />
            <ButtonMain
              type="button"
              variant="secondary"
              size="small"
              loading={busy === 'email-send'}
              onClick={requestEmailCode}
            >
              {emailRequested ? 'Resend code' : 'Send code'}
            </ButtonMain>
            <ButtonMain
              type="submit"
              size="small"
              loading={busy === 'email-confirm'}
              disabled={!emailCode.trim()}
            >
              Confirm
            </ButtonMain>
          </form>
        )}
      </ConnectedAccountRow>

      <ConnectedAccountRow
        label="Password"
        connected={Boolean(user?.hasPassword)}
        connectedLabel="Configured"
        missingLabel="Not configured"
        detail={`Recovery methods: ${recoveryLabel}`}
      >
        <ButtonMain
          type="button"
          size="small"
          disabled={recoveryMethods.length === 0}
          onClick={() =>
            window.location.assign(
              `${ROUTES.forgotPassword}?next=${encodeURIComponent(ROUTES.profileEdit)}`,
            )
          }
        >
          {user?.hasPassword ? 'Reset password' : 'Set password'}
        </ButtonMain>
      </ConnectedAccountRow>

      <ConnectedAccountRow label="GitHub" connected={githubConnected}>
        {githubConnected ? (
          <ButtonMain
            variant="secondary"
            loading={busy === 'github'}
            onClick={() => disconnect('github')}
          >
            Disconnect
          </ButtonMain>
        ) : (
          <ButtonMain loading={busy === 'github'} onClick={startGithubLink}>
            Connect
          </ButtonMain>
        )}
      </ConnectedAccountRow>

      <ConnectedAccountRow label="Telegram" connected={telegramConnected}>
        {telegramConnected ? (
          <ButtonMain
            variant="secondary"
            loading={busy === 'telegram'}
            onClick={() => disconnect('telegram')}
          >
            Disconnect
          </ButtonMain>
        ) : (
          // Bot deep-link flow; links to the current user on success.
          <TelegramLoginButton
            mode="link"
            onLinked={() => setMsg('Telegram account linked ✓')}
          />
        )}
      </ConnectedAccountRow>

      {error && <FeedbackText tone="error">{error}</FeedbackText>}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}
    </div>
  );
}
