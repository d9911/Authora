'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker on the client after mount. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid caching during dev
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* ignore registration errors */
      });
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
