import { Suspense } from 'react';
import { OAuthComplete } from './OAuthComplete';
import { LoaderMain } from '@/shared/ui';

export const metadata = { title: 'Signing in…' };

export default function OAuthCompletePage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <OAuthComplete />
    </Suspense>
  );
}
