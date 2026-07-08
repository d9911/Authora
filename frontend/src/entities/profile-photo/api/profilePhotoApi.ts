import { gqlRequest } from '@/shared/api/graphqlClient';
import { ProfileImageKind, ProfileImagePayload } from '@/shared/types';

const USER_FIELDS = `
  id name email nickname phoneNumber telegramId avatarUrl
  emailVerified twoFactorEnabled githubId createdAt updatedAt
`;

const PROFILE_FIELDS = `
  id userId bio isVerified description coverSrc cityId
  dateOfBirth gender address timezone createdAt updatedAt
`;

const PROFILE_IMAGE_FIELDS = `
  id userId kind contentType sizeBytes width height etag url createdAt updatedAt
`;

const PROFILE_IMAGE_PAYLOAD_FIELDS = `
  user { ${USER_FIELDS} }
  profile { ${PROFILE_FIELDS} }
  image { ${PROFILE_IMAGE_FIELDS} }
`;

export interface UploadProfileImageInput {
  kind: ProfileImageKind;
  dataBase64: string;
  mimeType: string;
}

export async function uploadProfileImage(
  input: UploadProfileImageInput,
): Promise<ProfileImagePayload> {
  const data = await gqlRequest<{ uploadProfileImage: ProfileImagePayload }>(
    `mutation UploadProfileImage($input: ProfileImageUploadInput!) {
      uploadProfileImage(input: $input) { ${PROFILE_IMAGE_PAYLOAD_FIELDS} }
    }`,
    { input },
  );
  return data.uploadProfileImage;
}

export async function deleteProfileImage(kind: ProfileImageKind): Promise<ProfileImagePayload> {
  const data = await gqlRequest<{ deleteProfileImage: ProfileImagePayload }>(
    `mutation DeleteProfileImage($kind: ProfileImageKind!) {
      deleteProfileImage(kind: $kind) { ${PROFILE_IMAGE_PAYLOAD_FIELDS} }
    }`,
    { kind },
  );
  return data.deleteProfileImage;
}
