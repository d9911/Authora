import { Suspense } from 'react';
import { SignInForm } from '@/features/SignInForm/SignInForm';
import { LoaderMain } from '@/shared/ui';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <SignInForm />
    </Suspense>
  );
}
