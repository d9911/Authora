export const typeDefs = /* GraphQL */ `
  scalar DateTime

  type User {
    id: ID!
    name: String
    email: String!
    nickname: String
    phoneNumber: String
    telegramId: String
    avatarUrl: String
    emailVerified: Boolean!
    twoFactorEnabled: Boolean!
    githubId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Profile {
    id: ID!
    userId: ID!
    bio: String
    isVerified: Boolean!
    description: String
    coverSrc: String
    cityId: ID
    dateOfBirth: DateTime
    gender: String
    address: String
    timezone: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Country {
    id: ID!
    name: String!
    code: String
    regions: [Region!]!
    cities: [City!]!
  }

  type Region {
    id: ID!
    name: String!
    countryId: ID!
    cities: [City!]!
  }

  type City {
    id: ID!
    name: String!
    countryId: ID
    regionId: ID
  }

  type AuthPayload {
    accessToken: String
    refreshToken: String
    user: User
    needTwoFactor: Boolean!
    twoFactorToken: String
  }

  type TwoFactorSetupPayload {
    qrDataUrl: String!
    otpauthUrl: String!
  }

  input SignUpInput {
    email: String!
    password: String!
    name: String
    nickname: String
  }

  input SignInInput {
    email: String!
    password: String!
  }

  input RefreshTokenInput {
    refreshToken: String!
  }

  input RequestPasswordResetInput {
    email: String!
  }

  input ResetPasswordInput {
    token: String!
    newPassword: String!
  }

  input SignInTwoFactorInput {
    twoFactorToken: String!
    code: String!
  }

  input UpdateProfileInput {
    name: String
    nickname: String
    phoneNumber: String
    avatarUrl: String
    bio: String
    description: String
    coverSrc: String
    cityId: ID
    dateOfBirth: DateTime
    gender: String
    address: String
    timezone: String
  }

  type Query {
    me: User
    myProfile: Profile
    user(id: ID!): User
    countries: [Country!]!
    country(id: ID!): Country
    region(id: ID!): Region
    city(id: ID!): City
  }

  type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    signInTwoFactor(input: SignInTwoFactorInput!): AuthPayload!
    refreshToken(input: RefreshTokenInput!): AuthPayload!
    logout(refreshToken: String): Boolean!
    confirmEmailCode(email: String!, code: String!): Boolean!
    resendEmailCode(email: String!): Boolean!
    requestPasswordReset(input: RequestPasswordResetInput!): Boolean!
    resetPassword(input: ResetPasswordInput!): Boolean!
    changePassword(oldPassword: String!, newPassword: String!): Boolean!
    enableTwoFactor: TwoFactorSetupPayload!
    confirmTwoFactor(code: String!): Boolean!
    disableTwoFactor(code: String!): Boolean!
    updateProfile(input: UpdateProfileInput!): Profile!

    # OAuth: exchange the backend handoff token for a real session (sets cookies
    # on the frontend origin via the proxy).
    oauthExchange(handoff: String!): AuthPayload!
    # OAuth linking for authenticated users: get a short-lived token to start the
    # provider flow with ?link=<token>, and unlink a provider.
    oauthLinkToken: String!
    unlinkProvider(provider: String!): User!
  }
`;
