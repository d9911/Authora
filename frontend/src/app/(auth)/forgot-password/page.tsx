import { Suspense } from 'react';
import { PasswordResetForm } from '@/features/PasswordResetForm/PasswordResetForm';
import { LoaderMain } from '@/shared/ui';

export const metadata = {
  title: 'Account recovery',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <PasswordResetForm mode="request" />
    </Suspense>
  );
}
