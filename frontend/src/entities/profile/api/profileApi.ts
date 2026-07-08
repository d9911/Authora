import { gqlRequest } from '@/shared/api/graphqlClient';
import { Profile } from '@/shared/types';

const PROFILE_FIELDS = `
  id userId bio isVerified description coverSrc cityId
  dateOfBirth gender address timezone createdAt updatedAt
`;

export interface UpdateProfileInput {
  name?: string;
  nickname?: string;
  phoneNumber?: string;
  bio?: string;
  description?: string;
  cityId?: string | null;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  timezone?: string;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const data = await gqlRequest<{ myProfile: Profile | null }>(
    `query MyProfile { myProfile { ${PROFILE_FIELDS} } }`,
  );
  return data.myProfile;
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const data = await gqlRequest<{ updateProfile: Profile }>(
    `mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) { ${PROFILE_FIELDS} }
    }`,
    { input },
  );
  return data.updateProfile;
}
