'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Trans, useTranslation } from 'react-i18next';
import { loadMeThunk } from '@/processes/store/slices/authSlice';
import { confirmEmailCode, resendEmailCode } from '@/features/auth-api/authApi';
import { ButtonMain, FeedbackText, InputMain, OtpCodeInput } from '@/shared/ui';
import { useAppDispatch } from '@/processes/store/hooks';
import { ErrorDescriptor, getErrorDescriptor } from '@/shared/lib/errors';
import { DEFAULT_OTP_LENGTH, normalizeNumericCode } from '@/shared/lib/otp';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { translateError, useCurrentLocale } from '@/shared/i18n';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';

export function ConfirmEmailForm() {
  const { t } = useTranslation('auth');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<ErrorDescriptor | { localized: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const autoSubmitKeyRef = useRef<string | null>(null);

  const urlEmail = params.get('email')?.trim() ?? '';
  const urlCodeParam = params.get('code');
  const urlCode = normalizeNumericCode(urlCodeParam ?? '');

  const submitCode = useCallback(
    async (nextCode = code, nextEmail = email) => {
      const normalized = normalizeNumericCode(nextCode);
      const normalizedEmail = nextEmail.trim();
      if (busy) return;
      if (!normalizedEmail) {
        setError({ localized: t('confirmEmail.errors.emailRequired') });
        return;
      }
      if (normalized.length !== DEFAULT_OTP_LENGTH) {
        setError({ localized: t('confirmEmail.errors.invalidCodeLength') });
        return;
      }
      setError(null);
      setMsg(null);
      setBusy(true);
      try {
        await confirmEmailCode(normalizedEmail, normalized);
        await dispatch(loadMeThunk());
        setMsg(t('confirmEmail.success.confirmedRedirecting'));
        router.replace(routes.home);
      } catch (e) {
        setError(getErrorDescriptor(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, code, dispatch, email, router, routes.home, t],
  );

  useEffect(() => {
    if (urlEmail) setEmail(urlEmail);
    if (urlCodeParam !== null) setCode(urlCode);
  }, [urlCode, urlCodeParam, urlEmail]);

  useEffect(() => {
    if (!urlEmail || urlCode.length !== DEFAULT_OTP_LENGTH) return;

    const autoSubmitKey = JSON.stringify([urlEmail, urlCode]);
    if (autoSubmitKeyRef.current === autoSubmitKey) return;

    autoSubmitKeyRef.current = autoSubmitKey;
    void submitCode(urlCode, urlEmail);
  }, [submitCode, urlCode, urlEmail]);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    void submitCode();
  };

  const onResend = async () => {
    setError(null);
    setMsg(null);
    if (!email.trim()) {
      setError({ localized: t('confirmEmail.errors.emailRequired') });
      return;
    }
    setResending(true);
    try {
      await resendEmailCode(email.trim());
      setMsg(t('confirmEmail.success.codeResent'));
    } catch (e) {
      setError(getErrorDescriptor(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow={t('confirmEmail.eyebrow')}
      title={t('confirmEmail.title')}
      subtitle={
        <Trans
          t={t}
          i18nKey="confirmEmail.subtitle"
          values={{ email: email || t('confirmEmail.emailFallback') }}
          components={{ strong: <strong /> }}
        />
      }
    >
      {!params.get('email') && (
        <InputMain
          label={t('confirmEmail.fields.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      )}

      <OtpCodeInput
        label={t('confirmEmail.fields.code')}
        value={code}
        onValueChange={setCode}
        onComplete={(value) => void submitCode(value)}
        placeholder="123456"
        required
        autoFocus
      />

      {error && (
        <FeedbackText tone="error">
          {'localized' in error ? error.localized : translateError(tErrors, error)}
        </FeedbackText>
      )}
      {msg && <FeedbackText tone="success">{msg}</FeedbackText>}

      <div
        className="confirm-actions"
        style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}
      >
        <ButtonMain type="submit" fullWidth loading={busy} disabled={code.length !== DEFAULT_OTP_LENGTH}>
          {t('confirmEmail.actions.confirm')}
        </ButtonMain>

        <ButtonMain
          type="button"
          variant="ghost"
          fullWidth
          loading={resending}
          onClick={onResend}
        >
          {t('confirmEmail.actions.resend')}
        </ButtonMain>
      </div>
    </AuthFormShell>
  );
}
