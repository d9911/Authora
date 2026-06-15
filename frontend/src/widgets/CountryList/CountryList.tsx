import Link from 'next/link'
import { Country } from '@/shared/types'

export function CountryList({ countries }: { countries: Country[] }) {
  if (!countries.length) {
    return <p className="muted">No countries yet. Seed the backend to populate the atlas.</p>
  }
  return (
    <div className="grid grid-3">
      {countries.map((c) => (
        <Link key={c.id} href={`/country/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-link" style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0 }}>{c.name}</h4>
              {/* ISO code as credential-style data */}
              <span className="mono" style={{ fontSize: 12, color: 'var(--iris)', letterSpacing: '0.08em' }}>
                {c.code ?? '—'}
              </span>
            </div>
            <span className="mono" style={{ display: 'block', marginTop: 14, fontSize: 12, color: 'var(--mist)' }}>
              view regions →
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
