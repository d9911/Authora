'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks';
import { clearAuthError, signUpThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain, PasswordInput } from '@/shared/ui';
import {
  PASSWORD_ALLOWED_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/shared/lib/passwordPolicy';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { translateError, useCurrentLocale } from '@/shared/i18n';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import styles from '@/features/AuthForm/AuthForm.module.scss';

export function SignUpForm() {
  const { t } = useTranslation('auth');
  const { t: tValidation } = useTranslation('validation');
  const { t: tErrors } = useTranslation('errors');
  const locale = useCurrentLocale();
  const routes = getLocalizedRoutes(locale);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error, errorCode } = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const passwordPolicyMessage = tValidation('passwordPolicy', {
    min: PASSWORD_MIN_LENGTH,
    max: PASSWORD_MAX_LENGTH,
  });

  const passwordInvalid = password.length > 0 && !PASSWORD_ALLOWED_REGEX.test(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordError =
    (passwordTouched || localError) && passwordInvalid ? passwordPolicyMessage : null;
  const confirmPasswordError =
    (confirmTouched || localError) && passwordMismatch ? tValidation('passwordMismatch') : null;
  const submitDisabled =
    busy ||
    !email.trim() ||
    !password ||
    !confirmPassword ||
    !PASSWORD_ALLOWED_REGEX.test(password) ||
    password !== confirmPassword;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!PASSWORD_ALLOWED_REGEX.test(password)) {
      setLocalError(passwordPolicyMessage);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(tValidation('passwordMismatch'));
      return;
    }

    setBusy(true);
    dispatch(clearAuthError());
    const res = await dispatch(signUpThunk({ email, password, name: name || undefined }));
    setBusy(false);
    if (signUpThunk.fulfilled.match(res)) {
      router.replace(`${routes.confirmEmail}?email=${encodeURIComponent(email.trim())}`);
    }
  };

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow={t('signUp.eyebrow')}
      title={t('signUp.title')}
      footer={
        <div className={styles['auth-footer']}>
          {t('signUp.existingAccountPrompt')}{' '}
          <Link href={routes.signIn}>{t('signUp.signIn')}</Link>
        </div>
      }
    >
      <InputMain label={t('signUp.fields.name')} value={name} onChange={(e) => setName(e.target.value)} />
      <InputMain
        label={t('signUp.fields.email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <PasswordInput
        id="sign-up-password"
        label={t('signUp.fields.password')}
        value={password}
        error={passwordError}
        required
        autoComplete="new-password"
        showAriaLabel={t('signUp.fields.passwordShowAriaLabel')}
        hideAriaLabel={t('signUp.fields.passwordHideAriaLabel')}
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordTouched(true);
          setLocalError(null);
        }}
      />
      <PasswordInput
        id="sign-up-confirm-password"
        label={t('signUp.fields.confirmPassword')}
        value={confirmPassword}
        error={confirmPasswordError}
        required
        autoComplete="new-password"
        showAriaLabel={t('signUp.fields.confirmPasswordShowAriaLabel')}
        hideAriaLabel={t('signUp.fields.confirmPasswordHideAriaLabel')}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setConfirmTouched(true);
          setLocalError(null);
        }}
      />
      {error && (
        <div className={styles['auth-error']}>
          {translateError(tErrors, { code: errorCode, message: error })}
        </div>
      )}
      <ButtonMain type="submit" fullWidth loading={busy} disabled={submitDisabled}>
        {t('signUp.submit')}
      </ButtonMain>
      <p className={styles['auth-subtitle']} style={{ marginTop: 12 }}>
        {t('signUp.confirmationHint')}
      </p>
    </AuthFormShell>
  );
}
