module.exports = {
  apps: [
    {
      name: "traveltales",
      script: "./dist/src/server.js",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
