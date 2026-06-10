// Domain types mirrored from the backend GraphQL schema.

export interface User {
  id: string;
  name?: string;
  email: string;
  nickname?: string;
  phoneNumber?: string;
  telegramId?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  githubId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  isVerified: boolean;
  description?: string;
  coverSrc?: string;
  cityId?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  name: string;
  countryId?: string;
  regionId?: string;
}

export interface Region {
  id: string;
  name: string;
  countryId: string;
  cities?: City[];
}

export interface Country {
  id: string;
  name: string;
  code?: string;
  regions?: Region[];
  cities?: City[];
}

export interface AuthPayload {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: User | null;
  needTwoFactor: boolean;
  twoFactorToken?: string | null;
}

export interface TwoFactorSetupPayload {
  qrDataUrl: string;
  otpauthUrl: string;
}

// Shape of an error coming back from the backend (extensions.code).
export interface ApiError {
  message: string;
  code: string;
  statusCode?: number;
}
