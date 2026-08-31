module.exports = {
  apps: [
    {
      name: 'canetti-sistema',
      script: 'dist/server.js',
      cwd: './backend',
      watch: false,
      env: {
        PORT: 3333,
        NODE_ENV: 'production'
      }
    }
  ]
};
