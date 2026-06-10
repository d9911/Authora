import { config } from '@/shared/config';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1>About {config.appName}</h1>
      <p>
        This is a demo fullstack application built with a Next.js frontend (Feature-Sliced
        Design) and an Express + GraphQL backend (Clean Architecture). It showcases JWT
        authentication with refresh-token rotation, email confirmation, password recovery,
        two-factor authentication, profile management, and public geographic pages.
      </p>
      <p className="muted">Frontend: Next.js · TypeScript · Redux · Sass · PWA.</p>
    </div>
  );
}
