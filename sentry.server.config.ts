import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // HTTP tracing is automatically enabled in @sentry/nextjs
  // No need to manually add Http integration
  
  // Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    const request = event.request;
    
    // Remove sensitive headers
    if (request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-csrf-token'];
      sensitiveHeaders.forEach(header => {
        if ((request.headers as any)[header]) {
          (request.headers as any)[header] = '[REDACTED]';
        }
      });
    }
    
    // Remove sensitive request data
    if (request?.data) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'currentPassword', 'newPassword'];
      sensitiveFields.forEach(field => {
        if ((request.data as any)[field]) {
          (request.data as any)[field] = '[REDACTED]';
        }
      });
    }
    
    // Remove database URLs and connection strings from error messages
    if (event.message) {
      event.message = event.message.replace(
        /(postgresql?:\/\/[^@]+@[^\s]+|DATABASE_URL[^\s]+)/gi,
        '[REDACTED]'
      );
    }
    
    // Remove sensitive data from extra context
    if (event.extra) {
      Object.keys(event.extra).forEach(key => {
        const value = (event.extra as any)[key];
        if (typeof value === 'string' && 
            (value.includes('postgresql://') || 
             value.includes('DATABASE_URL'))) {
          (event.extra as any)[key] = '[REDACTED]';
        }
      });
    }
    
    return event;
  },
  
  // Set initial scope
  initialScope: {
    tags: {
      component: "server",
    },
  },
  
  // Only send errors in production (or when DSN is set)
  enabled: !!process.env.SENTRY_DSN,
});

