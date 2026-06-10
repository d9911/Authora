module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'dist/app/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
