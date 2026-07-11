/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle for a small Docker runtime image.
  output: 'standalone',
  // The frontend talks to its own /api/* proxy routes, never to the backend
  // directly. BACKEND_INTERNAL_URL is only read on the server side.
  env: {
    NEXT_PUBLIC_APP_NAME: 'Authora',
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      ...['/forgot-password', '/reset-password', '/confirm-email'].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      })),
    ];
  },
};

export default nextConfig;
