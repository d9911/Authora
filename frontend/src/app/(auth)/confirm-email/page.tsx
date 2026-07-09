import { Suspense } from 'react';
import { ConfirmEmailForm } from '@/features/ConfirmEmailForm/ConfirmEmailForm';
import { LoaderMain } from '@/shared/ui';

export const metadata = { title: 'Confirm email' };

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <ConfirmEmailForm />
    </Suspense>
  );
}
