import { User } from '../../../modules/user/domain/User';
import { Profile } from '../../../modules/profile/domain/Profile';
import { Country, Region, City } from '../../../modules/location/domain';

/* eslint-disable @typescript-eslint/no-explicit-any */
const str = (v: any): string | undefined => (v === null || v === undefined ? undefined : String(v));
const date = (v: any): Date => new Date(v);
const optDate = (v: any): Date | undefined => (v ? new Date(v) : undefined);

export function mapUser(row: any): User {
  return {
    id: String(row.id),
    name: row.name ?? undefined,
    email: row.email,
    password: row.password ?? undefined,
    nickname: row.nickname ?? undefined,
    phoneNumber: row.phoneNumber ?? undefined,
    telegramId: str(row.telegramId),
    avatarUrl: row.avatarUrl ?? undefined,
    emailVerified: Boolean(row.emailVerified),
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    twoFactorSecret: row.twoFactorSecret ?? undefined,
    githubId: str(row.githubId),
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
}

export function mapProfile(row: any): Profile {
  return {
    id: String(row.id),
    userId: String(row.userId),
    bio: row.bio ?? undefined,
    isVerified: Boolean(row.isVerified),
    description: row.description ?? undefined,
    coverSrc: row.coverSrc ?? undefined,
    cityId: str(row.cityId),
    dateOfBirth: optDate(row.dateOfBirth),
    gender: row.gender ?? undefined,
    address: row.address ?? undefined,
    timezone: row.timezone ?? undefined,
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
}

export function mapCountry(row: any): Country {
  return {
    id: String(row.id),
    name: row.name,
    code: row.code ?? undefined,
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
}

export function mapRegion(row: any): Region {
  return {
    id: String(row.id),
    name: row.name,
    countryId: String(row.countryId),
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
}

export function mapCity(row: any): City {
  return {
    id: String(row.id),
    name: row.name,
    countryId: str(row.countryId),
    regionId: str(row.regionId),
    createdAt: date(row.createdAt),
    updatedAt: date(row.updatedAt),
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}
