import { Suspense } from 'react';
import { PasswordResetForm } from '@/features/PasswordResetForm/PasswordResetForm';
import { LoaderMain } from '@/shared/ui';

export const metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <PasswordResetForm mode="reset" />
    </Suspense>
  );
}
