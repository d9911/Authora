export type ProfileImageKind = 'avatar' | 'cover';

export interface ProfileImage {
  id: string;
  userId: string;
  kind: ProfileImageKind;
  contentType: string;
  data: Buffer;
  sizeBytes: number;
  width: number;
  height: number;
  etag: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProfileImageWrite = Omit<
  ProfileImage,
  'id' | 'userId' | 'kind' | 'createdAt' | 'updatedAt'
>;

export type ProfileImageMetadata = Omit<ProfileImage, 'data'> & {
  url: string;
};

export function profileImageUrl(userId: string, kind: ProfileImageKind, etag: string): string {
  return `/api/profile-images/${encodeURIComponent(userId)}/${kind}?v=${encodeURIComponent(etag)}`;
}

export function toProfileImageMetadata(image: ProfileImage): ProfileImageMetadata {
  const { data, ...metadata } = image;
  void data;
  return {
    ...metadata,
    url: profileImageUrl(image.userId, image.kind, image.etag),
  };
}
