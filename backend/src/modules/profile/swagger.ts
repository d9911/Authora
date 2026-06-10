/** Swagger documentation for the Profile module. */
export const profileSwagger = {
  tags: [{ name: 'Profile', description: 'Profile read & update (GraphQL).' }],
  examples: {
    MyProfile: {
      summary: 'Get the current user profile (authenticated)',
      value: { query: 'query { myProfile { id bio gender timezone isVerified } }' },
    },
    UpdateProfile: {
      summary: 'Update profile and user fields (authenticated)',
      value: {
        query:
          'mutation UpdateProfile($input: UpdateProfileInput!) { updateProfile(input: $input) { id bio gender timezone } }',
        variables: {
          input: { name: 'Alice B', bio: 'Hello world', gender: 'female', timezone: 'Europe/Moscow' },
        },
      },
    },
  },
};
