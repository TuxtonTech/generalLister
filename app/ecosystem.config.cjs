module.exports = {
  apps: [{
    name: 'gen-app',
    script: './build/index.js', // Use built version instead of start.js
    instances: 1,
    exec_mode: 'cluster',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    // Auto restart settings
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    
    // Memory and CPU limits
    max_memory_restart: '1G'
  }]
};