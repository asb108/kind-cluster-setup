/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Disable experimental features that are causing errors
  experimental: {
    ppr: false,
  },

  // API proxy configuration to forward API calls to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8020/api/:path*',
      },
    ];
  },

  // Resolve duplicate route warnings
  async redirects() {
    return [
      {
        source: '/api/apply-resource-limits',
        destination: '/api/apply-resource-limits',
        permanent: true,
      },
    ];
  },

  // Ensure CSS is processed properly
  sassOptions: {
    includePaths: ['./styles'],
  },

  // Static image handling
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
  },

  // Improved error handling
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
