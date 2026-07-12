'use client';

// Денис: файл создан или изменён по запросу пользователя.

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'next/navigation';
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
import { Badge, ButtonMain, FeedbackText, InputMain, OtpCodeInput } from '@/shared/ui';
import { translateError } from '@/shared/i18n/errors';
import { i18nConfig, normalizeLocale } from '@/shared/i18n/config';
import { normalizeNumericCode } from '@/shared/lib/otp';
import { getLocalizedRoutes } from '@/shared/lib/routes';

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
  connectedLabel,
  missingLabel,
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
          <Badge tone="success" variant="outline" style={{ marginLeft: 6 }}>
            {connectedLabel}
          </Badge>
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
  const { t } = useTranslation('profile');
  const { t: tErrors } = useTranslation('errors');
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const params = useParams<{ locale?: string }>();
  const locale = normalizeLocale(params.locale) ?? i18nConfig.defaultLocale;
  const routes = getLocalizedRoutes(locale);
  const { user } = useAppSelector((s) => s.auth);

  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [emailCode, setEmailCode] = useState('');
  const [emailRequested, setEmailRequested] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeMode, setEmailChangeMode] = useState(false);
  const [emailChangeRequested, setEmailChangeRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const connectedLabel = t('security.status.connected');
  const missingLabel = t('security.status.notConnected');

  // Confirmation when returning from a GitHub link (?linked=github).
  useEffect(() => {
    const linked = searchParams.get('linked');
    if (linked === 'github' || linked === 'telegram') {
      setMsg(
        t('security.providers.linked', {
          provider: linked === 'github' ? 'GitHub' : 'Telegram',
        }),
      );
      void dispatch(loadMeThunk());
    }
  }, [searchParams, dispatch, t]);

  // GitHub linking = full-page redirect to the backend with a link token.
  const startGithubLink = async () => {
    setError(null);
    setMsg(null);
    setBusy('github');
    try {
      const token = await getOAuthLinkToken();
      window.location.href = `${config.backendPublicUrl}/api/auth/github?link=${encodeURIComponent(token)}`;
    } catch (e) {
      setError(translateError(tErrors, e, 'fallback'));
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
      setMsg(
        t('security.providers.disconnected', {
          provider: provider === 'github' ? 'GitHub' : 'Telegram',
        }),
      );
    } catch (e) {
      setError(translateError(tErrors, e, 'fallback'));
    } finally {
      setBusy(null);
    }
  };

  const requestEmailCode = async () => {
    if (!user?.email) {
      setError(t('security.email.notLoaded'));
      return;
    }
    setError(null);
    setMsg(null);
    setBusy('email-send');
    try {
      await resendEmailCode(user.email);
      setEmailRequested(true);
      setMsg(t('security.email.codeSent', { email: user.email }));
    } catch (e) {
      setError(translateError(tErrors, e, 'fallback'));
    } finally {
      setBusy(null);
    }
  };

  const submitEmailCode = async (nextCode = emailCode) => {
    if (!user?.email) {
      setError(t('security.email.notLoaded'));
      return;
    }
    const code = normalizeNumericCode(nextCode);
    if (busy) return;
    if (!code) {
      setError(t('security.email.codeRequired'));
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
      setMsg(t('security.email.confirmed'));
    } catch (e) {
      setError(translateError(tErrors, e, 'fallback'));
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
      setError(t('security.email.newRequired'));
      return;
    }
    setError(null);
    setMsg(null);
    setBusy('email-change-request');
    try {
      await requestEmailChange(newEmail.trim());
      setEmailChangeRequested(true);
      setMsg(t('security.email.newCodeSent', { email: newEmail.trim() }));
    } catch (requestError) {
      setError(translateError(tErrors, requestError, 'fallback'));
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
      setMsg(t('security.email.changeConfirmed'));
    } catch (confirmError) {
      setError(translateError(tErrors, confirmError, 'fallback'));
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
    ? recoveryMethods
        .map((method) =>
          method === 'EMAIL'
            ? t('security.recovery.email')
            : t('security.recovery.telegram'),
        )
        .join(', ')
    : t('security.recovery.none');

  return (
    <div className="card">
      <h2>{t('security.title')}</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        {t('security.description')}
      </p>

      <ConnectedAccountRow
        label={t('security.email.label')}
        connected={emailVerified}
        connectedLabel={t('security.status.verified')}
        missingLabel={
          emailRequested
            ? t('security.status.codeSent')
            : t('security.status.notVerified')
        }
        detail={user?.email}
      >
        {changingEmail ? (
          <form
            onSubmit={confirmNewEmail}
            style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}
          >
            <InputMain
              aria-label={t('security.email.newAriaLabel')}
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              disabled={emailChangeRequested}
              style={{ width: 190 }}
            />
            {emailChangeRequested ? (
              <OtpCodeInput
                aria-label={t('security.email.newCodeAriaLabel')}
                value={emailCode}
                onValueChange={setEmailCode}
                onComplete={(value) => void submitEmailChangeCode(value)}
                placeholder={t('security.email.codePlaceholder')}
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
              {emailChangeRequested
                ? t('security.email.confirm')
                : t('security.email.sendCode')}
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
                {t('security.actions.cancel')}
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
            {t('security.email.change')}
          </ButtonMain>
        ) : (
          <form
            onSubmit={confirmEmail}
            style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}
          >
            <OtpCodeInput
              aria-label={t('security.email.codeAriaLabel')}
              value={emailCode}
              onValueChange={setEmailCode}
              onComplete={(value) => void submitEmailCode(value)}
              placeholder={t('security.email.codePlaceholder')}
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
              {emailRequested
                ? t('security.email.resendCode')
                : t('security.email.sendCode')}
            </ButtonMain>
            <ButtonMain
              type="submit"
              size="small"
              loading={busy === 'email-confirm'}
              disabled={!emailCode.trim()}
            >
              {t('security.actions.confirm')}
            </ButtonMain>
          </form>
        )}
      </ConnectedAccountRow>

      <ConnectedAccountRow
        label={t('security.password.label')}
        connected={Boolean(user?.hasPassword)}
        connectedLabel={t('security.status.configured')}
        missingLabel={t('security.status.notConfigured')}
        detail={t('security.recovery.methods', { methods: recoveryLabel })}
      >
        <ButtonMain
          type="button"
          size="small"
          disabled={recoveryMethods.length === 0}
          onClick={() =>
            window.location.assign(
              `${routes.forgotPassword}?next=${encodeURIComponent(routes.profileEdit)}`,
            )
          }
        >
          {user?.hasPassword
            ? t('security.password.reset')
            : t('security.password.set')}
        </ButtonMain>
      </ConnectedAccountRow>

      <ConnectedAccountRow
        label="GitHub"
        connected={githubConnected}
        connectedLabel={connectedLabel}
        missingLabel={missingLabel}
      >
        {githubConnected ? (
          <ButtonMain
            variant="secondary"
            loading={busy === 'github'}
            onClick={() => disconnect('github')}
          >
            {t('security.providers.disconnect')}
          </ButtonMain>
        ) : (
          <ButtonMain loading={busy === 'github'} onClick={startGithubLink}>
            {t('security.providers.connect')}
          </ButtonMain>
        )}
      </ConnectedAccountRow>

      <ConnectedAccountRow
        label="Telegram"
        connected={telegramConnected}
        connectedLabel={connectedLabel}
        missingLabel={missingLabel}
      >
        {telegramConnected ? (
          <ButtonMain
            variant="secondary"
            loading={busy === 'telegram'}
            onClick={() => disconnect('telegram')}
          >
            {t('security.providers.disconnect')}
          </ButtonMain>
        ) : (
          // Bot deep-link flow; links to the current user on success.
          <TelegramLoginButton
            mode="link"
            onLinked={() =>
              setMsg(t('security.providers.linked', { provider: 'Telegram' }))
            }
          />
        )}
      </ConnectedAccountRow>

      {error && <FeedbackText tone="error">{error}</FeedbackText>}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}
    </div>
  );
}
