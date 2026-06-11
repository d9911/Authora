/**
 * Shared seed dataset used by both the SQLite and MongoDB seeders, so the two
 * databases get identical content.
 */

export interface SeedCity {
  name: string;
}
export interface SeedRegion {
  name: string;
  cities: string[];
}
export interface SeedCountry {
  name: string;
  code: string;
  regions: SeedRegion[];
}

export const SEED_COUNTRIES: SeedCountry[] = [
  {
    name: 'Russia',
    code: 'RU',
    regions: [
      { name: 'Moscow Oblast', cities: ['Moscow', 'Khimki', 'Podolsk', 'Balashikha'] },
      { name: 'Leningrad Oblast', cities: ['Saint Petersburg', 'Gatchina', 'Vyborg'] },
      { name: 'Krasnodar Krai', cities: ['Krasnodar', 'Sochi', 'Novorossiysk'] },
      { name: 'Sverdlovsk Oblast', cities: ['Yekaterinburg', 'Nizhny Tagil'] },
    ],
  },
  {
    name: 'United States',
    code: 'US',
    regions: [
      { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'] },
      { name: 'New York', cities: ['New York City', 'Buffalo', 'Rochester'] },
      { name: 'Texas', cities: ['Houston', 'Austin', 'Dallas'] },
      { name: 'Washington', cities: ['Seattle', 'Spokane'] },
    ],
  },
  {
    name: 'Germany',
    code: 'DE',
    regions: [
      { name: 'Bavaria', cities: ['Munich', 'Nuremberg', 'Augsburg'] },
      { name: 'Berlin', cities: ['Berlin'] },
      { name: 'Hamburg', cities: ['Hamburg'] },
      { name: 'North Rhine-Westphalia', cities: ['Cologne', 'Düsseldorf', 'Dortmund'] },
    ],
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    regions: [
      { name: 'England', cities: ['London', 'Manchester', 'Liverpool', 'Bristol'] },
      { name: 'Scotland', cities: ['Edinburgh', 'Glasgow'] },
      { name: 'Wales', cities: ['Cardiff', 'Swansea'] },
    ],
  },
  {
    name: 'France',
    code: 'FR',
    regions: [
      { name: 'Île-de-France', cities: ['Paris', 'Versailles'] },
      { name: "Provence-Alpes-Côte d'Azur", cities: ['Marseille', 'Nice', 'Cannes'] },
      { name: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Grenoble'] },
    ],
  },
  {
    name: 'Japan',
    code: 'JP',
    regions: [
      { name: 'Kantō', cities: ['Tokyo', 'Yokohama', 'Kawasaki'] },
      { name: 'Kansai', cities: ['Osaka', 'Kyoto', 'Kobe'] },
    ],
  },
];

export interface SeedUser {
  email: string;
  password: string; // plain; the seeder hashes it
  name: string;
  nickname?: string;
  emailVerified: boolean;
  profile: {
    bio?: string;
    description?: string;
    gender?: string;
    timezone?: string;
    address?: string;
  };
  twoFactor?: {
    /** Raw secret bytes provided as a hex string. Converted to base32 for storage. */
    secretHex: string;
  };
}

/**
 * The key/owner account. Login: d.99113@gmail.com / d9911.
 * 2FA is enabled; the secret comes from the provided token (hex) and is stored
 * as base32 so it works in Google Authenticator / Authy and with TOTP verify.
 */
export const KEY_USER: SeedUser = {
  email: 'd.99113@gmail.com',
  password: 'd9911',
  name: 'Denis Gutsuliak',
  nickname: 'd9911',
  emailVerified: true,
  profile: {
    bio: 'Authora owner account',
    description: 'Full-stack developer. Web / Backend / Integrations.',
    gender: 'male',
    timezone: 'Europe/Moscow',
    address: 'Moscow, Russia',
  },
  twoFactor: { secretHex: 'c3516442d42c4bb599b58e5ead567afa' },
};

export const DEMO_USERS: SeedUser[] = [
  {
    email: 'alice@example.com',
    password: 'password123',
    name: 'Alice Johnson',
    nickname: 'alice',
    emailVerified: true,
    profile: { bio: 'Frontend engineer', gender: 'female', timezone: 'America/Los_Angeles' },
  },
  {
    email: 'bob@example.com',
    password: 'password123',
    name: 'Bob Smith',
    nickname: 'bob',
    emailVerified: true,
    profile: { bio: 'Backend engineer', gender: 'male', timezone: 'Europe/Berlin' },
  },
  {
    email: 'carol@example.com',
    password: 'password123',
    name: 'Carol White',
    nickname: 'carol',
    emailVerified: false,
    profile: { bio: 'Designer', gender: 'female', timezone: 'Europe/London' },
  },
];

/** RFC 4648 base32 encoder (uppercase, no padding) — what TOTP apps expect. */
export function base32FromHex(hex: string): string {
  const bytes = Buffer.from(hex, 'hex');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}
