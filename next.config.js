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
  // Security headers including CSP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // 'unsafe-eval' needed for Next.js dev mode
              "style-src 'self' 'unsafe-inline'", // 'unsafe-inline' needed for Tailwind CSS
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Optimize webpack to reduce cache size
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // In development, reduce cache size
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 0, // Reduce memory usage
      };
    }
    
    return config;
  },
  // Limit output size
  outputFileTracing: true,
  compress: true,
}

module.exports = nextConfig

