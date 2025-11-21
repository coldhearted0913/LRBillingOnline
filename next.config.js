const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',
    ],
  },
  env: {
    // Only expose non-sensitive environment variables to client
    LR_PREFIX: 'MT/25-26/',
    // SECURITY: Never expose sensitive credentials (DATABASE_URL, S3 keys) to client-side
    // These should only be accessed server-side via process.env
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
              "connect-src 'self' https: https://*.sentry.io https://*.ingest.sentry.io",
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
    
    // Suppress warnings from Sentry/OpenTelemetry instrumentation
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
    ];
    
    return config;
  },
  // Limit output size
  outputFileTracing: true,
  compress: true,
}

// Wrap Next.js config with Sentry (only if DSN is configured)
const sentryOptions = process.env.SENTRY_DSN ? {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
} : {};

const sentryWebpackPluginOptions = process.env.SENTRY_DSN ? {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Suppresses source map uploading logs during build
  hideSourceMaps: true,
  
  // Automatically inject Sentry release information
  widenClientFileUpload: true,
  
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',
} : {};

// Only wrap with Sentry if DSN is configured
module.exports = process.env.SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryOptions, sentryWebpackPluginOptions)
  : nextConfig;

