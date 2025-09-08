module.exports = {
  apps: [{
    name: 'app',
    script: './build',
    env_file: '.env',
    env: {
      NODE_ENV: 'production'
    }
  }]
};