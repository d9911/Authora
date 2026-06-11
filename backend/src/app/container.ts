import { createRepositories, Repositories } from '../infrastructure/database/repositories';
import { MailService } from '../infrastructure/mail/MailService';
import { TwoFactorService } from '../modules/auth/services/TwoFactorService';
import { GithubOAuthService } from '../modules/auth/oauth/GithubOAuthService';
import { TelegramAuthService } from '../modules/auth/oauth/TelegramAuthService';
import { AuthUseCases } from '../modules/auth/use-cases/AuthUseCases';
import { UserUseCases } from '../modules/user/use-cases/UserUseCases';
import { ProfileUseCases } from '../modules/profile/use-cases/ProfileUseCases';
import { LocationUseCases } from '../modules/location/use-cases/LocationUseCases';

export interface Container {
  repos: Repositories;
  mail: MailService;
  twoFactor: TwoFactorService;
  github: GithubOAuthService;
  telegram: TelegramAuthService;
  auth: AuthUseCases;
  users: UserUseCases;
  profiles: ProfileUseCases;
  locations: LocationUseCases;
}

let container: Container | null = null;

/** Compose the object graph once and reuse it across requests. */
export function getContainer(): Container {
  if (container) return container;

  const repos = createRepositories();
  const mail = new MailService();
  const twoFactor = new TwoFactorService();
  const github = new GithubOAuthService();
  const telegram = new TelegramAuthService();

  const auth = new AuthUseCases({
    users: repos.users,
    profiles: repos.profiles,
    refreshTokens: repos.refreshTokens,
    emailTokens: repos.emailTokens,
    mail,
    twoFactor,
  });
  const users = new UserUseCases(repos.users);
  const profiles = new ProfileUseCases(repos.profiles, repos.users);
  const locations = new LocationUseCases(repos.locations);

  container = { repos, mail, twoFactor, github, telegram, auth, users, profiles, locations };
  return container;
}
