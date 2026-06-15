'use client';

import { ReactNode } from 'react';

interface ModalMainProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

export function ModalMain({ open, title, onClose, children }: ModalMainProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 30, 43, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          padding: 24,
          boxShadow: 'var(--shadow-4)',
        }}
      >
        {title && <h4>{title}</h4>}
        {children}
      </div>
    </div>
  );
}
