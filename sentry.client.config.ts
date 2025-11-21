import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Capture unhandled promise rejections
  integrations: [
    new Sentry.BrowserTracing({
      // Set tracing origins
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/.*\.vercel\.app/,
        /^https:\/\/.*\.railway\.app/,
      ],
    }),
  ],
  
  // Filter out sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive fields from request data
    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
      sensitiveFields.forEach(field => {
        if (event.request.data[field]) {
          event.request.data[field] = '[REDACTED]';
        }
      });
    }
    
    // Remove sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-csrf-token'];
      sensitiveHeaders.forEach(header => {
        if (event.request.headers[header]) {
          event.request.headers[header] = '[REDACTED]';
        }
      });
    }
    
    return event;
  },
  
  // Set initial scope
  initialScope: {
    tags: {
      component: "client",
    },
  },
  
  // Only send errors in production (or when DSN is set)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

