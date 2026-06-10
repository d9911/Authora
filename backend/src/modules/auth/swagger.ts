/**
 * Swagger documentation for the Auth module.
 *
 * The API is GraphQL-first (single POST /graphql endpoint), so each operation
 * is documented as a tagged example with the exact query/variables to send.
 */
export const authSwagger = {
  tags: [
    {
      name: 'Auth',
      description:
        'Authentication & account security. All operations are GraphQL mutations sent to POST /graphql.',
    },
  ],
  examples: {
    SignUp: {
      summary: 'Register with email/password',
      value: {
        query:
          'mutation SignUp($input: SignUpInput!) { signUp(input: $input) { accessToken refreshToken needTwoFactor user { id email emailVerified } } }',
        variables: {
          input: { email: 'alice@example.com', password: 'password123', name: 'Alice' },
        },
      },
    },
    SignIn: {
      summary: 'Login. Returns needTwoFactor=true + twoFactorToken if 2FA is enabled',
      value: {
        query:
          'mutation SignIn($input: SignInInput!) { signIn(input: $input) { accessToken refreshToken needTwoFactor twoFactorToken user { id email } } }',
        variables: { input: { email: 'alice@example.com', password: 'password123' } },
      },
    },
    SignInTwoFactor: {
      summary: 'Complete 2FA login using the twoFactorToken + authenticator code',
      value: {
        query:
          'mutation SignInTwoFactor($input: SignInTwoFactorInput!) { signInTwoFactor(input: $input) { accessToken refreshToken user { id email } } }',
        variables: { input: { twoFactorToken: '<ticket-from-signIn>', code: '123456' } },
      },
    },
    RefreshToken: {
      summary: 'Rotate tokens. Old refresh token is revoked',
      value: {
        query:
          'mutation RefreshToken($input: RefreshTokenInput!) { refreshToken(input: $input) { accessToken refreshToken } }',
        variables: { input: { refreshToken: '<refresh-token>' } },
      },
    },
    Logout: {
      summary: 'Revoke a refresh token',
      value: { query: 'mutation Logout($t: String) { logout(refreshToken: $t) }', variables: { t: '<refresh-token>' } },
    },
    ConfirmEmail: {
      summary: 'Confirm email via token from the verification link',
      value: { query: 'mutation ($token: String!) { confirmEmail(token: $token) }', variables: { token: '<email-token>' } },
    },
    RequestPasswordReset: {
      summary: 'Request a password reset email',
      value: {
        query:
          'mutation ($input: RequestPasswordResetInput!) { requestPasswordReset(input: $input) }',
        variables: { input: { email: 'alice@example.com' } },
      },
    },
    ResetPassword: {
      summary: 'Set a new password using the reset token',
      value: {
        query: 'mutation ($input: ResetPasswordInput!) { resetPassword(input: $input) }',
        variables: { input: { token: '<reset-token>', newPassword: 'newpassword123' } },
      },
    },
    ChangePassword: {
      summary: 'Change password (authenticated)',
      value: {
        query:
          'mutation ($o: String!, $n: String!) { changePassword(oldPassword: $o, newPassword: $n) }',
        variables: { o: 'password123', n: 'newpassword123' },
      },
    },
    EnableTwoFactor: {
      summary: 'Start 2FA enrollment — returns a QR code (authenticated)',
      value: { query: 'mutation { enableTwoFactor { qrDataUrl otpauthUrl } }' },
    },
    ConfirmTwoFactor: {
      summary: 'Confirm 2FA enrollment with a code (authenticated)',
      value: { query: 'mutation ($code: String!) { confirmTwoFactor(code: $code) }', variables: { code: '123456' } },
    },
    DisableTwoFactor: {
      summary: 'Disable 2FA with a code (authenticated)',
      value: { query: 'mutation ($code: String!) { disableTwoFactor(code: $code) }', variables: { code: '123456' } },
    },
  },
};
