/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: this disables ESLint during build, not recommended for production
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This ignores TypeScript errors during build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 