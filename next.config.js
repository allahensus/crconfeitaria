/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    '/api/**/*': ['./prisma/dev.db'],
    '/*': ['./prisma/dev.db'],
  },
};

module.exports = nextConfig;
