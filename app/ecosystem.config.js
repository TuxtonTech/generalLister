module.exports = {
  apps: [{
    name: 'sveltekit-app',
    script: './build/index.js',
    env_file: '.env',
    env: {
      NODE_ENV: 'production'
    }
  }]
};