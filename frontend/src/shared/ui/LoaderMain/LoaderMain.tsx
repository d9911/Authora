'use client';

export function LoaderMain({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
        color: 'var(--mist)',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          border: '2px solid var(--line)',
          borderTopColor: 'var(--iris)',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
