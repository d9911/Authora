'use client';

import { useTranslation } from 'react-i18next';

export function LoaderMain({ label }: { label?: string }) {
  const { t } = useTranslation('common');

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
      {label ?? t('status.loading')}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
