import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  
  // Adjust sample rate for performance monitoring (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Capture unhandled promise rejections
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-csrf-token'];
      sensitiveHeaders.forEach(header => {
        if (event.request.headers[header]) {
          event.request.headers[header] = '[REDACTED]';
        }
      });
    }
    
    // Remove sensitive request data
    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'currentPassword', 'newPassword'];
      sensitiveFields.forEach(field => {
        if (event.request.data[field]) {
          event.request.data[field] = '[REDACTED]';
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
        if (typeof event.extra[key] === 'string' && 
            (event.extra[key].includes('postgresql://') || 
             event.extra[key].includes('DATABASE_URL'))) {
          event.extra[key] = '[REDACTED]';
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

