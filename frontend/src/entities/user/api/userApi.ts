import { gqlRequest } from '@/shared/api/graphqlClient';
import type { User } from '@/shared/types';

const USER_FIELDS = `
  id name email nickname phoneNumber telegramId avatarUrl
  emailVerified twoFactorEnabled githubId hasPassword recoveryMethods createdAt updatedAt
`;

export async function fetchMe(): Promise<User | null> {
  const data = await gqlRequest<{ me: User | null }>(
    `query Me { me { ${USER_FIELDS} } }`,
  );
  return data.me;
}

export async function fetchUserById(id: string): Promise<User | null> {
  const data = await gqlRequest<{ user: User | null }>(
    `query User($id: ID!) { user(id: $id) { ${USER_FIELDS} } }`,
    { id },
  );
  return data.user;
}
