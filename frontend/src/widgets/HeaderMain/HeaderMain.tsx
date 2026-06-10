'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { loadMeThunk, logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';

const navLinkStyle: React.CSSProperties = {
  color: 'var(--slate)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
};

function LeafLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1.5c1.6 3 5 5.6 5 11 0 4.2-2.4 7-4.3 8.2l-.4 1.3h-.6l-.4-1.3C9.4 19.5 7 16.7 7 12.5c0-5.4 3.4-8 5-11z"
        fill="var(--brand-green-mid)"
      />
      <path
        d="M12 1.5c1.6 3 5 5.6 5 11 0 4.2-2.4 7-4.3 8.2l-.4 1.3H12V1.5z"
        fill="var(--brand-green-dark)"
      />
    </svg>
  );
}

export function HeaderMain() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, status } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (status === 'idle') void dispatch(loadMeThunk());
  }, [dispatch, status]);

  const onLogout = async () => {
    await dispatch(logoutThunk());
    router.push('/');
  };

  return (
    <header
      style={{
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--canvas)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
            fontSize: 18,
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          <LeafLogo />
          {config.appName}
        </Link>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/country" style={navLinkStyle}>
            Countries
          </Link>
          <Link href="/about" style={navLinkStyle}>
            About
          </Link>
          {user ? (
            <>
              <Link href="/profile/edit" style={navLinkStyle}>
                {user.name || user.email}
              </Link>
              <ButtonMain variant="secondary" onClick={onLogout}>
                Logout
              </ButtonMain>
            </>
          ) : (
            <>
              <Link href="/sign-in" style={navLinkStyle}>
                Sign In
              </Link>
              <ButtonMain onClick={() => router.push('/sign-up')}>Try Free</ButtonMain>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
