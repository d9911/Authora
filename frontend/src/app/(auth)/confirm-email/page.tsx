'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { confirmEmail } from '@/features/auth-api/authApi';
import { LoaderMain } from '@/shared/ui';

export default function ConfirmEmailPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    confirmEmail(token)
      .then((ok) => setState(ok ? 'ok' : 'error'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="card" style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
      <h2>Email confirmation</h2>
      {state === 'pending' && <LoaderMain label="Confirming…" />}
      {state === 'ok' && (
        <>
          <p className="success-text">Your email has been confirmed ✓</p>
          <Link href="/profile/edit">Go to profile</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <p className="error-text">This confirmation link is invalid or expired.</p>
          <Link href="/login">Back to login</Link>
        </>
      )}
    </div>
  );
}
