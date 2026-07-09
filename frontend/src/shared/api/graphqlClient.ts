import { axiosInstance } from './axiosInstance';
import { ApiError } from '../types';
import { ROUTES } from '@/shared/lib/routes';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string; statusCode?: number } }>;
}

export class GraphQLRequestError extends Error implements ApiError {
  code: string;
  statusCode?: number;
  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'GraphQLRequestError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

let refreshing: Promise<boolean> | null = null;

function redirectToSignIn(): Promise<never> {
  localStorage.removeItem('user');
  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `${ROUTES.signIn}?next=${encodeURIComponent(nextPath)}`;
  return new Promise(() => {});
}

// Request both tokens so the proxy re-stores the rotated pair as cookies.
const REFRESH_MUTATION = /* GraphQL */ `
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      needTwoFactor
    }
  }
`;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = axiosInstance
      .post('/graphql', { query: REFRESH_MUTATION, variables: { input: {} } })
      .then((res) => !res.data?.errors)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/**
 * Browser-side GraphQL caller. On UNAUTHORIZED/INVALID_TOKEN it transparently
 * attempts a single refresh (the proxy reads the refresh cookie) and retries.
 */
export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: { retry?: boolean },
): Promise<T> {
  const res = await axiosInstance.post<GraphQLResponse<T>>('/graphql', { query, variables });
  const { data, errors } = res.data;

  if (errors && errors.length) {
    const first = errors[0];
    const code = first.extensions?.code ?? 'INTERNAL';
    const retryable = code === 'UNAUTHORIZED' || code === 'INVALID_TOKEN';
    const canRetry = options?.retry !== false;

    if (retryable && canRetry) {
      const ok = await tryRefresh();
      if (ok) return gqlRequest<T>(query, variables, { retry: false });

      // Refresh failed → clear local state and force logout, preserving return URL.
      if (typeof window !== 'undefined') {
        return redirectToSignIn();
      }
    }
    throw new GraphQLRequestError(first.message, code, first.extensions?.statusCode);
  }

  return data as T;
}
