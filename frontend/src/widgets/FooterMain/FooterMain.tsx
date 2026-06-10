import { config } from '@/shared/config';

export function FooterMain() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-muted)',
        marginTop: 40,
      }}
    >
      <div
        className="container"
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
        }}
      >
        <span>
          © {new Date().getFullYear()} {config.appName}
        </span>
        <span>Built with Next.js · FSD</span>
      </div>
    </footer>
  );
}
