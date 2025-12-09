module.exports = {
  apps: [
    {
      name: "benq",
      script: "npm",
      args: "start",
      cwd: "/home/kioh/benq",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
      watch: false
    },
    {
      name: "realtime",
      script: "server.js",
      cwd: "/home/kioh/benq/realtime",
      autorestart: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
