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
  allowedDevOrigins: ['https://a271-2c0f-f5c0-576-350a-e525-d570-61d-6383.ngrok-free.app'],
};

module.exports = nextConfig; 