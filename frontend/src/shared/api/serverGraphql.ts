import { config } from '../config';

/**
 * Server-side GraphQL fetch for public pages (React Server Components).
 * Public location queries need no auth, so we hit the backend directly
 * from the server (same trust boundary as the proxy).
 */
export async function serverGql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${config.backendInternalUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}
