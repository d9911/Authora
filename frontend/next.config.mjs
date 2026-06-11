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
    ];
  },
};

export default nextConfig;
