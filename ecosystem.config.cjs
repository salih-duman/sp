const productionEnv = {
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: '3000',
  TRUST_PROXY: '1',
};

module.exports = {
  apps: [
    {
      name: 'app',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '350M',
      time: true,
      env: productionEnv,
      env_production: productionEnv,
    },
  ],
};
