import { GraphQLRequestError } from '@/shared/api/graphqlClient';

export type ErrorDescriptor = {
  code: string | null;
  message: string;
};

export function getErrorDescriptor(error: unknown, fallback = 'Error'): ErrorDescriptor {
  if (error instanceof GraphQLRequestError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: null, message: error.message };
  }
  return { code: null, message: fallback };
}

export function getErrorMessage(error: unknown, fallback = 'Error'): string {
  return getErrorDescriptor(error, fallback).message;
}
