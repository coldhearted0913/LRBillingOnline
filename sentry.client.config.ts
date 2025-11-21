import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Browser tracing is automatically enabled in @sentry/nextjs
  // No need to manually add BrowserTracing integration
  
  // Filter out sensitive data before sending to Sentry
  beforeSend(event, hint) {
    const request = event.request;
    
    // Remove sensitive fields from request data
    if (request?.data) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
      sensitiveFields.forEach(field => {
        if ((request.data as any)[field]) {
          (request.data as any)[field] = '[REDACTED]';
        }
      });
    }
    
    // Remove sensitive headers
    if (request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-csrf-token'];
      sensitiveHeaders.forEach(header => {
        if ((request.headers as any)[header]) {
          (request.headers as any)[header] = '[REDACTED]';
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

