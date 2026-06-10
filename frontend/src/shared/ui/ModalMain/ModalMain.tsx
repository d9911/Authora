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
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 460 }}
      >
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
