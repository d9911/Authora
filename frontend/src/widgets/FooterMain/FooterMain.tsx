import Link from 'next/link';
import { config } from '@/shared/config';

const columns: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    title: 'Product',
    links: [
      { label: 'Countries', href: '/country' },
      { label: 'Profile', href: '/profile/edit' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In', href: '/sign-in' },
      { label: 'Create account', href: '/sign-up' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Home', href: '/' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Web Development', href: 'https://t.me/d9911/', external: true },
      { label: 'Backend', href: 'https://t.me/d9911/', external: true },
      { label: 'Integrations', href: 'https://t.me/d9911/', external: true },
    ],
  },
];

export function FooterMain() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
      {/* hover effects (inline styles can't express pseudo-classes) */}
      <style>{`
        .footer-link:hover { color: var(--on-ink) !important; opacity: 1 !important; }
        .footer-social-link:hover { opacity: 0.8 !important; }
      `}</style>

      <div className="container" style={{ padding: '64px 32px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 40,
          }}
        >
          {/* Brand & contacts column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px' }}>
                {config.appName}
              </span>
            </div>
            <p
              style={{
                color: 'var(--on-ink-mist)',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 320,
              }}
            >
              Модуль для сбора и управления заявками с клиентских сайтов. Разработка под
              ключ — быстро, качественно, с гарантией результата.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <span
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-ink)', opacity: 0.9 }}
              >
                Denis Gutsuliak
              </span>
              <a
                href="mailto:admin@d9911.org"
                className="footer-social-link"
                style={{
                  color: 'var(--on-ink-mist)',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                📧 admin@d9911.org
              </a>
              <a
                href="https://t.me/d9911/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                style={{
                  color: 'var(--on-ink-mist)',
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                💬 Telegram: @d9911
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 16,
                  opacity: 0.8,
                }}
              >
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map((l) =>
                  l.external ? (
                    <a
                      key={l.href + l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                      style={{
                        color: 'var(--on-ink-mist)',
                        fontSize: 14,
                        textDecoration: 'none',
                        transition: 'color 0.2s, opacity 0.2s',
                      }}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.href + l.label}
                      href={l.href}
                      className="footer-link"
                      style={{
                        color: 'var(--on-ink-mist)',
                        fontSize: 14,
                        textDecoration: 'none',
                        transition: 'color 0.2s, opacity 0.2s',
                      }}
                    >
                      {l.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: '1px solid var(--line-dark)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span style={{ color: 'var(--on-ink-mist)', fontSize: 13 }}>
            © {currentYear} {config.appName}. All rights reserved.
          </span>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <a href="#" style={{ color: 'var(--on-ink-mist)', fontSize: 13, textDecoration: 'none' }}>
              Privacy Policy
            </a>
            <a href="#" style={{ color: 'var(--on-ink-mist)', fontSize: 13, textDecoration: 'none' }}>
              Terms of Use
            </a>
            <span style={{ color: 'var(--line-dark)', fontSize: 13 }}>
              Built with Next.js · FSD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
