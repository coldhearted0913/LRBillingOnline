import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Lower sample rate for edge runtime
  tracesSampleRate: 0.1,
  
  // Filter sensitive data
  beforeSend(event, hint) {
    const request = event.request;
    
    // Remove sensitive headers
    if (request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
      sensitiveHeaders.forEach(header => {
        if ((request.headers as any)[header]) {
          (request.headers as any)[header] = '[REDACTED]';
        }
      });
    }
    
    return event;
  },
  
  enabled: !!process.env.SENTRY_DSN,
});

