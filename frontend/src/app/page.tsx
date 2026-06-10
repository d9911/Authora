import Link from 'next/link';
import { config } from '@/shared/config';

export default function HomePage() {
  return (
    <div>
      <h1>{config.appName}</h1>
      <p className="muted" style={{ maxWidth: 620 }}>
        A fullstack demo: email/password auth with JWT access &amp; refresh, email
        confirmation, password recovery, two-factor authentication, profile editing,
        and public country / region / city pages.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Link className="card" href="/country" style={{ flex: 1, textAlign: 'center' }}>
          Browse countries →
        </Link>
        <Link className="card" href="/login" style={{ flex: 1, textAlign: 'center' }}>
          Sign in →
        </Link>
        <Link className="card" href="/about" style={{ flex: 1, textAlign: 'center' }}>
          About →
        </Link>
      </div>
    </div>
  );
}
