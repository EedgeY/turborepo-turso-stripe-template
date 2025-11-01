/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@workspace/ui',
    '@workspace/auth',
    '@workspace/db',
    '@workspace/stripe',
  ],
};

export default nextConfig;
