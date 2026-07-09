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
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import { ButtonMain, FeedbackText, OtpCodeInput } from '@/shared/ui';
import { getErrorMessage } from '@/shared/lib/errors';
import { normalizeNumericCode } from '@/shared/lib/otp';

type Provider = 'github' | 'telegram';
type BusyAction = Provider | 'email-send' | 'email-confirm';

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
  detail?: string;
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

  const emailVerified = Boolean(user?.emailVerified);
  const githubConnected = Boolean(user?.githubId);
  const telegramConnected = Boolean(user?.telegramId);

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
        {emailVerified ? (
          <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>
            Active
          </span>
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
