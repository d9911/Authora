import Link from 'next/link';
import { ROUTES } from '@/shared/lib/routes';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h1>404</h1>
      <p className="muted">This page could not be found.</p>
      <Link href={ROUTES.home}>Go home</Link>
    </div>
  );
}
