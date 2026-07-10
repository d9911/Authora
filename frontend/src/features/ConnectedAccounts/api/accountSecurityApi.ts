import { gqlRequest } from '@/shared/api/graphqlClient';

export async function requestEmailChange(email: string): Promise<boolean> {
  const data = await gqlRequest<{ requestEmailChange: boolean }>(
    `mutation RequestEmailChange($email: String!) { requestEmailChange(email: $email) }`,
    { email },
  );
  return data.requestEmailChange;
}

export async function confirmEmailChange(code: string): Promise<boolean> {
  const data = await gqlRequest<{ confirmEmailChange: boolean }>(
    `mutation ConfirmEmailChange($code: String!) { confirmEmailChange(code: $code) }`,
    { code },
  );
  return data.confirmEmailChange;
}
