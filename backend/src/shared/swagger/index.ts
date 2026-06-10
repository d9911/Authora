import { env } from '../../config/env';
import { components } from './components';
import { authSwagger } from '../../modules/auth/swagger';
import { userSwagger } from '../../modules/user/swagger';
import { profileSwagger } from '../../modules/profile/swagger';
import { locationSwagger } from '../../modules/location/swagger';

/**
 * Aggregates per-module swagger definitions into a single OpenAPI 3 document.
 *
 * The API is GraphQL-first: there is one POST /graphql operation, and each
 * GraphQL query/mutation is documented as a named requestBody example.
 * REST endpoints (health) and OAuth callbacks are documented as real paths.
 */
function buildGraphqlExamples() {
  return {
    ...authSwagger.examples,
    ...userSwagger.examples,
    ...profileSwagger.examples,
    ...locationSwagger.examples,
  };
}

export function buildOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Fullstack App API',
      version: '0.1.0',
      description:
        'Express + GraphQL backend (Clean Architecture). Authentication, profile, ' +
        '2FA and public location data. Most operations go through the single ' +
        'GraphQL endpoint below; pick an example from the dropdown to try it.',
    },
    servers: [{ url: `http://localhost:${env.backendPort}`, description: 'Local' }],
    tags: [
      ...authSwagger.tags,
      ...userSwagger.tags,
      ...profileSwagger.tags,
      ...locationSwagger.tags,
      { name: 'System', description: 'Health & infrastructure.' },
    ],
    components,
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is up',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/graphql': {
        post: {
          tags: ['Auth', 'User', 'Profile', 'Location'],
          summary: 'GraphQL endpoint (all queries & mutations)',
          description:
            'Send a GraphQL query/mutation. Protected operations require the ' +
            'Authorization: Bearer <accessToken> header. Use the Examples dropdown ' +
            'to load ready-made operations.',
          security: [{}, { bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GraphQLRequest' },
                examples: buildGraphqlExamples(),
              },
            },
          },
          responses: {
            '200': {
              description: 'GraphQL result (errors are reported in the errors array)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GraphQLResponse' },
                },
              },
            },
          },
        },
      },
    },
  };
}
