module.exports = {
  apps: [
    {
      name: 'ams-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Restart policies
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      // Logging
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 8000,
      // Zero-downtime reload
      wait_ready: true,
    },
  ],
};
