'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { getOAuthLinkToken, unlinkProvider } from '@/features/auth-api/authApi';
import { TelegramLoginButton } from '@/features/TelegramLoginButton/TelegramLoginButton';
import { ButtonMain } from '@/shared/ui';
import { GraphQLRequestError } from '@/shared/api/graphqlClient';

const handle = (e: unknown) =>
  e instanceof GraphQLRequestError || e instanceof Error ? e.message : 'Error';

type Provider = 'github' | 'telegram';

export function ConnectedAccounts() {
  const dispatch = useAppDispatch();
  const params = useSearchParams();
  const { user } = useAppSelector((s) => s.auth);

  const [busy, setBusy] = useState<Provider | null>(null);
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
      setError(handle(e));
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
      setError(handle(e));
    } finally {
      setBusy(null);
    }
  };

  const githubConnected = Boolean(user?.githubId);
  const telegramConnected = Boolean(user?.telegramId);

  const Row = ({
    label,
    connected,
    children,
  }: {
    label: string;
    connected: boolean;
    children: React.ReactNode;
  }) => (
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
            Connected
          </span>
        ) : (
          <span className="muted" style={{ marginLeft: 6, fontSize: 13 }}>
            Not connected
          </span>
        )}
      </div>
      <div style={{ minWidth: 180, display: 'flex', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  );

  return (
    <div className="card">
      <h2>Connected accounts</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Link external accounts to sign in with one click.
      </p>

      <Row label="GitHub" connected={githubConnected}>
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
      </Row>

      <Row label="Telegram" connected={telegramConnected}>
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
      </Row>

      {error && <p className="error-text">{error}</p>}
      {msg && <p className="success-text">{msg}</p>}
    </div>
  );
}
