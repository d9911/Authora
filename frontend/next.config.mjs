/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The frontend talks to its own /api/* proxy routes, never to the backend
  // directly. BACKEND_INTERNAL_URL is only read on the server side.
  env: {
    NEXT_PUBLIC_APP_NAME: 'FullstackApp',
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
