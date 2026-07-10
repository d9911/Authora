import { inferEmailKind, User } from '../../../modules/user/domain/User';
import { Profile } from '../../../modules/profile/domain/Profile';
import { ProfileImage } from '../../../modules/profile-photo/domain/ProfileImage';
import { Country, Region, City } from '../../../modules/location/domain';

const idOf = (v: unknown): string => (v == null ? '' : String(v));

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapUser(doc: any): User {
  return {
    id: idOf(doc._id),
    name: doc.name ?? undefined,
    email: doc.email,
    emailKind: doc.emailKind ?? inferEmailKind(doc.email),
    password: doc.password ?? undefined,
    nickname: doc.nickname ?? undefined,
    phoneNumber: doc.phoneNumber ?? undefined,
    telegramId: doc.telegramId ?? undefined,
    avatarUrl: doc.avatarUrl ?? undefined,
    emailVerified: Boolean(doc.emailVerified),
    twoFactorEnabled: Boolean(doc.twoFactorEnabled),
    twoFactorSecret: doc.twoFactorSecret ?? undefined,
    githubId: doc.githubId ?? undefined,
    authVersion: Number(doc.authVersion ?? 0),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapProfile(doc: any): Profile {
  return {
    id: idOf(doc._id),
    userId: idOf(doc.userId),
    bio: doc.bio ?? undefined,
    isVerified: Boolean(doc.isVerified),
    description: doc.description ?? undefined,
    coverSrc: doc.coverSrc ?? undefined,
    cityId: doc.cityId ? idOf(doc.cityId) : undefined,
    dateOfBirth: doc.dateOfBirth ?? undefined,
    gender: doc.gender ?? undefined,
    address: doc.address ?? undefined,
    timezone: doc.timezone ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapProfileImage(doc: any): ProfileImage {
  const rawData = doc.data;
  const data = Buffer.isBuffer(rawData)
    ? rawData
    : Buffer.from(rawData?.buffer ?? rawData ?? []);
  return {
    id: idOf(doc._id),
    userId: idOf(doc.userId),
    kind: doc.kind,
    contentType: doc.contentType,
    data,
    sizeBytes: Number(doc.sizeBytes),
    width: Number(doc.width),
    height: Number(doc.height),
    etag: doc.etag,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapCountry(doc: any): Country {
  return {
    id: idOf(doc._id),
    name: doc.name,
    code: doc.code ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapRegion(doc: any): Region {
  return {
    id: idOf(doc._id),
    name: doc.name,
    countryId: idOf(doc.countryId),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapCity(doc: any): City {
  return {
    id: idOf(doc._id),
    name: doc.name,
    countryId: doc.countryId ? idOf(doc.countryId) : undefined,
    regionId: doc.regionId ? idOf(doc.regionId) : undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
