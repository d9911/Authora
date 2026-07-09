'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks';
import { clearAuthError, signUpThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain, PasswordInput } from '@/shared/ui';
import { PASSWORD_ALLOWED_REGEX, PASSWORD_POLICY_HINT } from '@/shared/lib/passwordPolicy';
import { ROUTES } from '@/shared/lib/routes';
import { AuthFormShell } from '@/features/AuthForm/AuthFormShell';
import styles from '@/features/AuthForm/AuthForm.module.scss';

const PASSWORD_MISMATCH_ERROR = 'Пароли не совпадают.';

export function SignUpForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error } = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const passwordInvalid = password.length > 0 && !PASSWORD_ALLOWED_REGEX.test(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordError = (passwordTouched || localError) && passwordInvalid ? PASSWORD_POLICY_HINT : null;
  const confirmPasswordError =
    (confirmTouched || localError) && passwordMismatch ? PASSWORD_MISMATCH_ERROR : null;
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
      setLocalError(PASSWORD_POLICY_HINT);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(PASSWORD_MISMATCH_ERROR);
      return;
    }

    setBusy(true);
    dispatch(clearAuthError());
    const res = await dispatch(signUpThunk({ email, password, name: name || undefined }));
    setBusy(false);
    if (signUpThunk.fulfilled.match(res)) {
      router.replace(`${ROUTES.confirmEmail}?email=${encodeURIComponent(email.trim())}`);
    }
  };

  return (
    <AuthFormShell
      onSubmit={onSubmit}
      eyebrow="New identity"
      title="Create account"
      footer={
        <div className={styles['auth-footer']}>
          Already have an account? <Link href={ROUTES.signIn}>Sign in</Link>
        </div>
      }
    >
      <InputMain label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <InputMain
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <PasswordInput
        id="sign-up-password"
        label="Password"
        value={password}
        error={passwordError}
        required
        autoComplete="new-password"
        showAriaLabel="Показать пароль"
        hideAriaLabel="Скрыть пароль"
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordTouched(true);
          setLocalError(null);
        }}
      />
      <PasswordInput
        id="sign-up-confirm-password"
        label="Confirm password"
        value={confirmPassword}
        error={confirmPasswordError}
        required
        autoComplete="new-password"
        showAriaLabel="Показать повтор пароля"
        hideAriaLabel="Скрыть повтор пароля"
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setConfirmTouched(true);
          setLocalError(null);
        }}
      />
      {error && <div className={styles['auth-error']}>{error}</div>}
      <ButtonMain type="submit" fullWidth loading={busy} disabled={submitDisabled}>
        Sign up
      </ButtonMain>
      <p className={styles['auth-subtitle']} style={{ marginTop: 12 }}>
        After signing up, enter the 6-digit code from your email.
      </p>
    </AuthFormShell>
  );
}
