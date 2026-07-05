module.exports = {
  apps: [
    {
      name: "kosanku",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/html/kosanku",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        APP_ENV: "production",
      },
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DDTHH:mm:ss",
      merge_logs: true,
      time: true,
    },
  ],
};
