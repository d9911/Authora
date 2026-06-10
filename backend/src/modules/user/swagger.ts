/** Swagger documentation for the User module. */
export const userSwagger = {
  tags: [{ name: 'User', description: 'Current user & user lookup (GraphQL queries).' }],
  examples: {
    Me: {
      summary: 'Get the current authenticated user',
      value: { query: 'query { me { id name email emailVerified twoFactorEnabled } }' },
    },
    UserById: {
      summary: 'Get a user by id',
      value: {
        query: 'query User($id: ID!) { user(id: $id) { id name email } }',
        variables: { id: '<user-id>' },
      },
    },
  },
};
