/**
 * Reusable OpenAPI component schemas, shared across module swagger files.
 * These mirror the GraphQL types so the docs and the API stay consistent.
 */
export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Access token returned by signIn / signUp / refreshToken.',
    },
  },
  schemas: {
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '665f1c2a9b3e4a0012ab34cd' },
        name: { type: 'string', nullable: true, example: 'Alice' },
        email: { type: 'string', format: 'email', example: 'alice@example.com' },
        nickname: { type: 'string', nullable: true },
        phoneNumber: { type: 'string', nullable: true },
        telegramId: { type: 'string', nullable: true },
        avatarUrl: { type: 'string', nullable: true },
        emailVerified: { type: 'boolean', example: false },
        twoFactorEnabled: { type: 'boolean', example: false },
        githubId: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Profile: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        bio: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
        description: { type: 'string', nullable: true },
        coverSrc: { type: 'string', nullable: true },
        cityId: { type: 'string', nullable: true },
        dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
        gender: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        timezone: { type: 'string', nullable: true, example: 'Europe/Moscow' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Country: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', example: 'Russia' },
        code: { type: 'string', nullable: true, example: 'RU' },
      },
    },
    Region: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', example: 'Moscow Oblast' },
        countryId: { type: 'string' },
      },
    },
    City: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', example: 'Moscow' },
        countryId: { type: 'string', nullable: true },
        regionId: { type: 'string', nullable: true },
      },
    },
    AuthPayload: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', nullable: true },
        refreshToken: { type: 'string', nullable: true },
        needTwoFactor: { type: 'boolean', example: false },
        twoFactorToken: {
          type: 'string',
          nullable: true,
          description: 'Short-lived ticket returned when needTwoFactor=true.',
        },
        user: { $ref: '#/components/schemas/User' },
      },
    },
    TwoFactorSetupPayload: {
      type: 'object',
      properties: {
        qrDataUrl: { type: 'string', example: 'data:image/png;base64,iVBORw0KGgo...' },
        otpauthUrl: { type: 'string', example: 'otpauth://totp/FullstackApp...' },
      },
    },
    GraphQLRequest: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', example: 'query { me { id email } }' },
        variables: { type: 'object', additionalProperties: true },
        operationName: { type: 'string', nullable: true },
      },
    },
    GraphQLResponse: {
      type: 'object',
      properties: {
        data: { type: 'object', additionalProperties: true, nullable: true },
        errors: {
          type: 'array',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              extensions: {
                type: 'object',
                properties: {
                  code: { $ref: '#/components/schemas/ApiErrorCode' },
                  statusCode: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    ApiErrorCode: {
      type: 'string',
      description: 'Stable machine-readable error codes that can reach the frontend.',
      enum: [
        'INTERNAL',
        'VALIDATION',
        'NOT_FOUND',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'INVALID_CREDENTIALS',
        'EMAIL_TAKEN',
        'EMAIL_NOT_VERIFIED',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'NEED_2FA',
        'INVALID_2FA_CODE',
        'TWO_FACTOR_ALREADY_ENABLED',
        'TWO_FACTOR_NOT_ENABLED',
      ],
    },
    HealthResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        db: { type: 'string', example: 'mongo' },
        time: { type: 'string', format: 'date-time' },
      },
    },
  },
};
