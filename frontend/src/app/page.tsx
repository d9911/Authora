import Link from 'next/link';
import { config } from '@/shared/config';
import { AuraSigil } from '@/shared/ui';
import { ROUTES } from '@/shared/lib/routes';

const capabilities = [
  {
    code: 'AUTH',
    title: 'Sessions that hold',
    desc: 'Email + password with JWT access & refresh, rotated and stored in httpOnly cookies. The token restores itself before you notice it lapsed.',
  },
  {
    code: '2FA',
    title: 'A second factor',
    desc: 'Time-based codes from any authenticator app, enrolled with a QR and verified on sign-in.',
  },
  {
    code: 'OAUTH',
    title: 'Bring your accounts',
    desc: 'Sign in or link GitHub and Telegram to one identity — connect and disconnect at will.',
  },
  {
    code: 'ATLAS',
    title: 'A public atlas',
    desc: 'Browse countries, regions and cities served straight from the GraphQL API.',
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero — the thesis: an identity inside its aura. */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)',
          gap: 40,
          alignItems: 'center',
          minHeight: 'min(64vh, 560px)',
        }}
      >
        <div>
          <span className="eyebrow">{config.appName} · identity platform</span>
          <h1 style={{ marginTop: 18 }}>
            Your identity,
            <br />
            wrapped in an&nbsp;
            <span style={{ color: 'var(--iris)' }}>aura</span>.
          </h1>
          <p className="subtitle" style={{ maxWidth: 460, marginTop: 6 }}>
            Authentication that protects without getting in the way — confirmation
            codes, recovery, two-factor and social linking, all in one calm surface.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Link
              href={ROUTES.signUp}
              style={{
                background: 'var(--iris)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 26px',
                borderRadius: 'var(--r-pill)',
                boxShadow: '0 12px 30px -12px rgba(91,75,255,0.7)',
              }}
            >
              Create your identity
            </Link>
            <Link
              href={ROUTES.countries}
              style={{
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                padding: '13px 26px',
                borderRadius: 'var(--r-pill)',
              }}
            >
              Explore the atlas
            </Link>
          </div>
          {/* credential strip — data as material */}
          <div
            className="mono"
            style={{
              marginTop: 34,
              fontSize: 12.5,
              color: 'var(--mist)',
              display: 'flex',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <span>jwt · access+refresh</span>
            <span style={{ color: 'var(--line)' }}>/</span>
            <span>totp · 2fa</span>
            <span style={{ color: 'var(--line)' }}>/</span>
            <span>oauth · github·telegram</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <AuraSigil size={300} />
        </div>
      </section>

      {/* Capabilities — a real list, labelled by domain (not decorative 01/02/03) */}
      <section style={{ marginTop: 24 }}>
        <div className="grid grid-3">
          {capabilities.map((c) => (
            <div key={c.code} className="card">
              <span className="eyebrow">{c.code}</span>
              <h4 style={{ marginTop: 12 }}>{c.title}</h4>
              <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
