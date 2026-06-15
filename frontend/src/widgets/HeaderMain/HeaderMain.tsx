'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { config } from '@/shared/config';
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux';
import { loadMeThunk, logoutThunk } from '@/processes/store/slices/authSlice';
import { ButtonMain } from '@/shared/ui';

const navLinkStyle: React.CSSProperties = {
  color: 'var(--mist)',
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
};

function AuraMark() {
  // Mini version of the hero sigil: concentric rings + core.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="var(--iris)" strokeOpacity="0.3" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--iris)" strokeOpacity="0.55" />
      <circle cx="12" cy="12" r="3.4" fill="var(--iris)" />
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
        borderBottom: '1px solid var(--line)',
        background: 'var(--card)',
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
            gap: 9,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          <AuraMark />
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
              <ButtonMain onClick={() => router.push('/sign-up')}>Get started</ButtonMain>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
