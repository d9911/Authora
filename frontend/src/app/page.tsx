import Link from 'next/link';
import { config } from '@/shared/config';

// Full-bleed wrapper: breaks out of the layout's centered container.
const fullBleed: React.CSSProperties = {
  position: 'relative',
  left: '50%',
  right: '50%',
  marginLeft: '-50vw',
  marginRight: '-50vw',
  width: '100vw',
};

const features = [
  {
    title: 'Secure auth',
    body: 'Email/password with JWT access & refresh, rotation and httpOnly cookies.',
  },
  {
    title: 'Two-factor',
    body: 'TOTP 2FA via authenticator apps, QR enrollment and gated sign-in.',
  },
  {
    title: 'Public data',
    body: 'Browse countries, regions and cities served from a GraphQL API.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero band */}
      <section style={{ ...fullBleed, background: 'var(--brand-teal-deep)', marginTop: -48 }}>
        <div className="container" style={{ padding: '96px 32px', textAlign: 'center' }}>
          <span
            className="eyebrow"
            style={{ color: 'var(--brand-green)', display: 'block', marginBottom: 16 }}
          >
            {config.appName}
          </span>
          <h1
            style={{
              color: 'var(--on-dark)',
              fontSize: 64,
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              maxWidth: 820,
              margin: '0 auto 20px',
            }}
          >
            One identity platform. Unlimited potential.
          </h1>
          <p
            className="subtitle"
            style={{ color: 'var(--on-dark-muted)', maxWidth: 600, margin: '0 auto 32px' }}
          >
            Authentication, profiles and public location data — JWT, email
            confirmation, password recovery and two-factor security out of the box.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/sign-up"
              style={{
                background: 'var(--brand-green)',
                color: 'var(--on-primary)',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 24px',
                borderRadius: 'var(--r-full)',
                textDecoration: 'none',
              }}
            >
              Try Free
            </Link>
            <Link
              href="/country"
              style={{
                background: 'transparent',
                color: 'var(--on-dark)',
                fontWeight: 600,
                fontSize: 14,
                padding: '12px 24px',
                borderRadius: 'var(--r-full)',
                border: '1px solid var(--hairline-dark)',
                textDecoration: 'none',
              }}
            >
              Browse countries
            </Link>
          </div>

          {/* Code mockup card */}
          <div
            style={{
              maxWidth: 560,
              margin: '48px auto 0',
              background: 'var(--canvas-dark)',
              border: '1px solid var(--hairline-dark)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-3)',
              textAlign: 'left',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '12px 16px',
                borderBottom: '1px solid var(--hairline-dark)',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <pre
              style={{
                margin: 0,
                padding: 20,
                fontFamily: 'var(--font-mono)',
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--on-dark)',
                overflowX: 'auto',
              }}
            >
              <span style={{ color: 'var(--brand-green)' }}>mutation</span>{' '}
              {'signUp(input: {\n'}
              {'  email: '}
              <span style={{ color: '#7fd1ff' }}>&quot;you@authora.dev&quot;</span>
              {',\n'}
              {'  password: '}
              <span style={{ color: '#7fd1ff' }}>&quot;••••••••&quot;</span>
              {'\n}) {\n'}
              {'  accessToken\n'}
              {'  user { '}
              <span style={{ color: 'var(--brand-green)' }}>id email</span>
              {' }\n}'}
            </pre>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ paddingTop: 64 }}>
        <div className="grid grid-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <h4>{f.title}</h4>
              <p className="muted" style={{ margin: 0 }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
