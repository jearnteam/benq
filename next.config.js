/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🚀 This is now a top-level option (no experimental block!)
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
