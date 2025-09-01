// next.config.ts
/** @type {import('next').NextConfig} */
const siteUrl = process.env.SITE_URL?.replace(/\/$/, '');
const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const allowedOrigins = siteUrl ? [siteUrl, ...localOrigins] : localOrigins;

const nextConfig = {
  experimental: {
    serverActions: {
      // Restrict to deployment origin + local dev fallbacks
      allowedOrigins,
    },
  },
};

module.exports = nextConfig;
