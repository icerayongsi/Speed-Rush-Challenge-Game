const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'speed-rush-backend',
      script: 'backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        ...process.env 
      },
      user: 'root',
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'speed-rush-frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --host --port 80',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/frontend-error.log',
      out_file: 'logs/frontend-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
