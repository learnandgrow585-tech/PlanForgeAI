/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@planforge/shared-types'],
  // Don't fail the production build on lint warnings (types are still checked)
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
};

module.exports = nextConfig;
