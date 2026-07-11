import Link from 'next/link';
import { config } from '@/shared/config';
import { getServerTranslation } from '@/shared/i18n/server';
import { type SupportedLocale } from '@/shared/i18n/config';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import styles from './FooterMain.module.scss';

export async function FooterMain({ locale }: { locale: SupportedLocale }) {
  const { t } = await getServerTranslation(locale, 'common');
  const routes = getLocalizedRoutes(locale);
  const currentYear = new Date().getFullYear();
  const columns: {
    id: string;
    title: string;
    links: { id: string; label: string; href: string; external?: boolean }[];
  }[] = [
    {
      id: 'product',
      title: t('footer.columns.product'),
      links: [
        { id: 'countries', label: t('footer.links.countries'), href: routes.countries },
        { id: 'profile', label: t('footer.links.profile'), href: routes.profileEdit },
      ],
    },
    {
      id: 'account',
      title: t('footer.columns.account'),
      links: [
        { id: 'signIn', label: t('footer.links.signIn'), href: routes.signIn },
        { id: 'signUp', label: t('footer.links.createAccount'), href: routes.signUp },
      ],
    },
    {
      id: 'company',
      title: t('footer.columns.company'),
      links: [
        { id: 'about', label: t('footer.links.about'), href: routes.about },
        { id: 'home', label: t('footer.links.home'), href: routes.home },
      ],
    },
    {
      id: 'services',
      title: t('footer.columns.services'),
      links: [
        {
          id: 'webDevelopment',
          label: t('footer.links.webDevelopment'),
          href: 'https://t.me/d9911/',
          external: true,
        },
        {
          id: 'backend',
          label: t('footer.links.backend'),
          href: 'https://t.me/d9911/',
          external: true,
        },
        {
          id: 'integrations',
          label: t('footer.links.integrations'),
          href: 'https://t.me/d9911/',
          external: true,
        },
      ],
    },
  ];

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
              {t('footer.description')}
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
            <div key={col.id} className={styles['footer-column']}>
              <div className={styles['footer-column-title']}>{col.title}</div>
              <div className={styles['footer-column-links']}>
                {col.links.map((l) =>
                  l.external ? (
                    <a
                      key={l.id}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles['footer-link']}
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.id} href={l.href} className={styles['footer-link']}>
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
            {t('footer.copyright', {
              year: currentYear,
              appName: config.appName,
            })}
          </span>

          <div className={styles['footer-bottom-links']}>
            <a href="#" className={styles['footer-bottom-link']}>
              {t('footer.privacy')}
            </a>
            <a href="#" className={styles['footer-bottom-link']}>
              {t('footer.terms')}
            </a>
            <span className={styles['footer-meta']}>{t('footer.builtWith')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
