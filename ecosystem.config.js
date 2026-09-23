module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'src/index.js',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '5s',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
