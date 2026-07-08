'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { clearAuthError, signUpThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain, InputMain } from '@/shared/ui';
import { PASSWORD_ALLOWED_REGEX, PASSWORD_POLICY_HINT } from '@/shared/lib/passwordPolicy';
import styles from '../SignInForm/SignInForm.module.scss';

const PASSWORD_MISMATCH_ERROR = 'Пароли не совпадают.';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  error: string | null;
  ariaLabel: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

function PasswordField({
  id,
  label,
  value,
  visible,
  error,
  ariaLabel,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div className={styles['password-field']}>
      <label className={styles['password-label']} htmlFor={id}>
        {label}
      </label>
      <div className={styles['password-control']}>
        <input
          id={id}
          className={styles['password-input']}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          className={styles['password-toggle']}
          type="button"
          aria-label={ariaLabel}
          onClick={onToggle}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className={styles['field-error']}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SignUpForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { error } = useAppSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      router.replace(`/confirm-email?email=${encodeURIComponent(email.trim())}`);
    }
  };

  return (
    <div className={styles['auth-wrapper']}>
      <form onSubmit={onSubmit} className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <span className="eyebrow">New identity</span>
          <h2 className={styles['auth-title']}>Create account</h2>
        </div>
        <div className={styles['auth-form']}>
          <InputMain label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <InputMain
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <PasswordField
            id="sign-up-password"
            label="Password"
            value={password}
            visible={showPassword}
            error={passwordError}
            ariaLabel={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            onToggle={() => setShowPassword((value) => !value)}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordTouched(true);
              setLocalError(null);
            }}
          />
          <PasswordField
            id="sign-up-confirm-password"
            label="Confirm password"
            value={confirmPassword}
            visible={showConfirmPassword}
            error={confirmPasswordError}
            ariaLabel={showConfirmPassword ? 'Скрыть повтор пароля' : 'Показать повтор пароля'}
            onToggle={() => setShowConfirmPassword((value) => !value)}
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
        </div>
        <div className={styles['auth-footer']}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
