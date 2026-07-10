export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Authora',

  // Server-side only: where the proxy forwards GraphQL requests.
  backendInternalUrl: process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3010',

  // Browser-facing backend URL for full-page OAuth redirects (GitHub/Telegram).
  // OAuth cannot go through the same-origin proxy — it's a redirect to the
  // provider and back to the backend callback.
  backendPublicUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3010',

  // Cookie names used to persist the JWT pair.
  cookies: {
    accessToken: 'access_token',
    refreshToken: 'refresh_token',
    recoveryToken: 'recovery_token',
  },

  // Browser-facing proxy endpoint.
  graphqlProxyPath: '/api/graphql',
} as const;
