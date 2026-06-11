// PM2 production process file for the whole Authora monorepo.
//
//   make prod-build && make prod-start
//   pm2 logs       pm2 status      pm2 restart authora-backend
//
// Both apps read their env from the respective .env files at runtime.
module.exports = {
  apps: [
    {
      name: 'authora-backend',
      cwd: './backend',
      script: 'dist/app/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        BACKEND_PORT: 3010,
      },
    },
    {
      name: 'authora-frontend',
      cwd: './frontend',
      // Next.js standalone server (produced by `next build` with output:'standalone').
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 5178,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
