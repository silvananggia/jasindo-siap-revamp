module.exports = {
    apps: [
      {
        name: 'siap-gis-be',
        script: 'index.js',
        watch: true,
        ignore_watch: ['node_modules', 'client'],
        env: {
          NODE_ENV: 'production',
        },
      },
    ],
  };
  