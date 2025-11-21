import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Lower sample rate for edge runtime
  tracesSampleRate: 0.1,
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      sensitiveHeaders.forEach(header => {
        if (event.request.headers[header]) {
          event.request.headers[header] = '[REDACTED]';
        }
      });
    }
    
    return event;
  },
  
  enabled: !!process.env.SENTRY_DSN,
});

