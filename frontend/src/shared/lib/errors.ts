import { GraphQLRequestError } from '@/shared/api/graphqlClient';

export function getErrorMessage(error: unknown, fallback = 'Error'): string {
  if (error instanceof GraphQLRequestError || error instanceof Error) return error.message;
  return fallback;
}
