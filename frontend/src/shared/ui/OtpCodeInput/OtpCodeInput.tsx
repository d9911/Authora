'use client';

import { InputHTMLAttributes } from 'react';
import { DEFAULT_OTP_LENGTH, normalizeNumericCode } from '@/shared/lib/otp';
import { InputMain } from '../InputMain/InputMain';

interface OtpCodeInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'maxLength' | 'onChange' | 'value'> {
  label?: string;
  mono?: boolean;
  value: string;
  length?: number;
  onValueChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function OtpCodeInput({
  value,
  length = DEFAULT_OTP_LENGTH,
  onValueChange,
  onComplete,
  inputMode = 'numeric',
  autoComplete = 'one-time-code',
  ...rest
}: OtpCodeInputProps) {
  return (
    <InputMain
      {...rest}
      value={value}
      inputMode={inputMode}
      autoComplete={autoComplete}
      maxLength={length}
      onChange={(event) => {
        const normalized = normalizeNumericCode(event.target.value, length);
        onValueChange(normalized);
        if (normalized.length === length) onComplete?.(normalized);
      }}
    />
  );
}
