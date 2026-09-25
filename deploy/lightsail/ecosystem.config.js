// pm2 process list for the Lightsail server. Both apps listen on localhost only;
// nginx is the sole public entry point.
const path = require('node:path');

const root = path.resolve(__dirname, '../..');

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: path.join(root, 'backend'), // reads backend/.env
      script: 'dist/src/main.js',
      env: { NODE_ENV: 'production', HOST: '127.0.0.1' },
      max_memory_restart: '600M',
    },
    {
      name: 'web',
      cwd: path.join(root, 'web'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001 -H 127.0.0.1',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '600M',
    },
  ],
};
