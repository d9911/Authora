import Link from 'next/link';
import { config } from '@/shared/config';
import { ROUTES } from '@/shared/lib/routes';
import styles from './FooterMain.module.scss';

const columns: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    title: 'Product',
    links: [
      { label: 'Countries', href: ROUTES.countries },
      { label: 'Profile', href: ROUTES.profileEdit },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign In', href: ROUTES.signIn },
      { label: 'Create account', href: ROUTES.signUp },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: ROUTES.about },
      { label: 'Home', href: ROUTES.home },
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
    <footer className={styles.footer}>
      <div className={`container ${styles['footer-container']}`}>
        <div className={styles['footer-grid']}>
          {/* Brand & contacts column */}
          <div className={styles['footer-brand']}>
            <div className={styles['footer-logo']}>
              <span>📋</span>
              <span>{config.appName}</span>
            </div>
            <p className={styles['footer-description']}>
              Модуль для сбора и управления заявками с клиентских сайтов. Разработка под
              ключ — быстро, качественно, с гарантией результата.
            </p>
            <div className={styles['footer-contacts']}>
              <span className={styles['footer-contact-name']}>Denis Gutsuliak</span>
              <a href="mailto:admin@d9911.org" className={styles['footer-social-link']}>
                📧 admin@d9911.org
              </a>
              <a
                href="https://t.me/d9911/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles['footer-social-link']}
              >
                💬 Telegram: @d9911
              </a>
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className={styles['footer-column']}>
              <div className={styles['footer-column-title']}>{col.title}</div>
              <div className={styles['footer-column-links']}>
                {col.links.map((l) =>
                  l.external ? (
                    <a
                      key={l.href + l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles['footer-link']}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.href + l.label} href={l.href} className={styles['footer-link']}>
                      {l.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className={styles['footer-bottom']}>
          <span className={styles['footer-copyright']}>
            © {currentYear} {config.appName}. All rights reserved.
          </span>

          <div className={styles['footer-bottom-links']}>
            <a href="#" className={styles['footer-bottom-link']}>
              Privacy Policy
            </a>
            <a href="#" className={styles['footer-bottom-link']}>
              Terms of Use
            </a>
            <span className={styles['footer-meta']}>Built with Next.js · FSD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
