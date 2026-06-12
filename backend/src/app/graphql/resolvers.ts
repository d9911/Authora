import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLContext } from './context';
import { AppError } from '../../core/errors/AppError';
import { verifyAccessToken } from '../../infrastructure/jwt/jwt';

function requireAuth(ctx: GraphQLContext): string {
  if (!ctx.userId) throw AppError.unauthorized();
  return ctx.userId;
}

const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO-8601 date-time',
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => (value ? new Date(value as string) : null),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resolvers = {
  DateTime,

  Country: {
    regions: (parent: any, _args: unknown, ctx: GraphQLContext) =>
      ctx.container.locations.getRegionsByCountry(parent.id),
    cities: (parent: any, _args: unknown, ctx: GraphQLContext) =>
      ctx.container.locations.getCitiesByCountry(parent.id),
  },
  Region: {
    cities: (parent: any, _args: unknown, ctx: GraphQLContext) =>
      ctx.container.locations.getCitiesByRegion(parent.id),
  },

  Query: {
    me: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      ctx.userId ? ctx.container.users.getById(ctx.userId) : null,
    myProfile: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.profiles.getByUserId(userId);
    },
    user: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.container.users.getById(args.id),
    countries: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      ctx.container.locations.listCountries(),
    country: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.container.locations.getCountry(args.id),
    region: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.container.locations.getRegion(args.id),
    city: (_p: unknown, args: { id: string }, ctx: GraphQLContext) =>
      ctx.container.locations.getCity(args.id),
  },

  Mutation: {
    signUp: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      ctx.container.auth.signUp(args.input).then(normalizeAuth),

    signIn: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      ctx.container.auth.signIn(args.input).then(normalizeAuth),

    signInTwoFactor: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const { twoFactorToken, code } = args.input;
      const payload = verifyAccessToken(twoFactorToken); // ticket from signIn step
      return ctx.container.auth
        .signInTwoFactor({ userId: payload.sub, code })
        .then(normalizeAuth);
    },

    refreshToken: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      ctx.container.auth.refresh(args.input.refreshToken).then(normalizeAuth),

    logout: (_p: unknown, args: { refreshToken?: string }, ctx: GraphQLContext) =>
      ctx.container.auth.logout(args.refreshToken),

    confirmEmailCode: (
      _p: unknown,
      args: { email: string; code: string },
      ctx: GraphQLContext,
    ) => ctx.container.auth.confirmEmailCode(args.email, args.code),

    resendEmailCode: (_p: unknown, args: { email: string }, ctx: GraphQLContext) =>
      ctx.container.auth.resendEmailCode(args.email),

    requestPasswordReset: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      ctx.container.auth.requestPasswordReset(args.input.email),

    resetPassword: (_p: unknown, args: { input: any }, ctx: GraphQLContext) =>
      ctx.container.auth.resetPassword(args.input.token, args.input.newPassword),

    changePassword: (
      _p: unknown,
      args: { oldPassword: string; newPassword: string },
      ctx: GraphQLContext,
    ) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.changePassword(userId, args.oldPassword, args.newPassword);
    },

    enableTwoFactor: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.enableTwoFactor(userId);
    },
    confirmTwoFactor: (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.confirmTwoFactor(userId, args.code);
    },
    disableTwoFactor: (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.disableTwoFactor(userId, args.code);
    },

    updateProfile: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.profiles.update(userId, args.input).then((r) => r.profile);
    },

    // OAuth: frontend exchanges the backend handoff token for a real session.
    oauthExchange: (_p: unknown, args: { handoff: string }, ctx: GraphQLContext) =>
      ctx.container.auth.exchangeOAuthHandoff(args.handoff).then(normalizeAuth),

    // Authenticated user starts a link flow: mint a short-lived link token.
    oauthLinkToken: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.issueOAuthLinkToken(userId);
    },

    unlinkProvider: (
      _p: unknown,
      args: { provider: 'github' | 'telegram' },
      ctx: GraphQLContext,
    ) => {
      const userId = requireAuth(ctx);
      return ctx.container.auth.unlinkProvider(userId, args.provider);
    },

    // Telegram bot deep-link: start (link=true requires auth) and poll.
    telegramBotStart: (_p: unknown, args: { link?: boolean }, ctx: GraphQLContext) => {
      const linkUserId = args.link ? requireAuth(ctx) : undefined;
      return ctx.container.auth.startTelegramBotLogin(linkUserId);
    },

    telegramBotPoll: async (_p: unknown, args: { token: string }, ctx: GraphQLContext) => {
      const result = await ctx.container.auth.pollTelegramBotLogin(args.token);
      if (result.status === 'done') {
        return { status: 'done', auth: normalizeAuth(result.auth) };
      }
      return { status: result.status, auth: null };
    },
  },
};

/** Ensure AuthPayload always has the non-null `needTwoFactor` field. */
function normalizeAuth(result: any) {
  return { needTwoFactor: false, ...result };
}
