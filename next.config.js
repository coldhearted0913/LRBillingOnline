/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
    ],
  },
  env: {
    LR_PREFIX: 'MT/25-26/',
    DATABASE_URL: process.env.DATABASE_URL || '',
    // S3 is optional - only set if you have AWS credentials
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
    S3_REGION: process.env.S3_REGION || '',
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  },
}

module.exports = nextConfig

