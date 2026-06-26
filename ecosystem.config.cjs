const isProduction = process.env.APP_ENV === 'production';

/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'kosanku',
      script: 'node_modules/next/dist/bin/next',
      args: isProduction ? 'start' : 'dev',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '.env',
      env: {
        NODE_ENV: isProduction ? 'production' : 'development',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
