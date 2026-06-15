import { Space_Grotesk, Inter, IBM_Plex_Mono } from 'next/font/google';

// Display — technical but characterful geometric grotesque.
export const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Body — neutral, highly legible.
export const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

// Mono — credential data: tokens, codes, IDs, country codes.
export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});
