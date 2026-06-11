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
  // When set, the Telegram widget is shown pre-loaded with a link token.
  const [tgLinkToken, setTgLinkToken] = useState<string | null>(null);

  // Show a confirmation when returning from a successful link (?linked=github).
  useEffect(() => {
    const linked = params.get('linked');
    if (linked === 'github' || linked === 'telegram') {
      setMsg(`${linked === 'github' ? 'GitHub' : 'Telegram'} account linked ✓`);
      void dispatch(loadMeThunk());
    }
  }, [params, dispatch]);

  const startLink = async (provider: Provider) => {
    setError(null);
    setMsg(null);
    setBusy(provider);
    try {
      const token = await getOAuthLinkToken();
      if (provider === 'github') {
        // Full-page redirect to the backend GitHub flow with the link token.
        window.location.href = `${config.backendPublicUrl}/api/auth/github?link=${encodeURIComponent(token)}`;
        return;
      }
      // Telegram must go through its signed widget; reveal it with the link token.
      setTgLinkToken(token);
      setBusy(null);
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

  const rows: { provider: Provider; label: string; connected: boolean }[] = [
    { provider: 'github', label: 'GitHub', connected: Boolean(user?.githubId) },
    { provider: 'telegram', label: 'Telegram', connected: Boolean(user?.telegramId) },
  ];

  return (
    <div className="card">
      <h2>Connected accounts</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        Link external accounts to sign in with one click.
      </p>

      {rows.map((r) => (
        <div
          key={r.provider}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: '1px solid var(--hairline-soft)',
          }}
        >
          <div>
            <strong>{r.label}</strong>{' '}
            {r.connected ? (
              <span className="badge-green-soft" style={{ marginLeft: 6 }}>
                Connected
              </span>
            ) : (
              <span className="muted" style={{ marginLeft: 6, fontSize: 13 }}>
                Not connected
              </span>
            )}
          </div>
          {r.connected ? (
            <ButtonMain
              variant="secondary"
              loading={busy === r.provider}
              onClick={() => disconnect(r.provider)}
            >
              Disconnect
            </ButtonMain>
          ) : r.provider === 'telegram' && tgLinkToken ? (
            <TelegramLoginButton linkToken={tgLinkToken} />
          ) : (
            <ButtonMain loading={busy === r.provider} onClick={() => startLink(r.provider)}>
              Connect
            </ButtonMain>
          )}
        </div>
      ))}

      {error && <p className="error-text">{error}</p>}
      {msg && <p className="success-text">{msg}</p>}
    </div>
  );
}
