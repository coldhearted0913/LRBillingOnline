import * as Sentry from "@sentry/nextjs";

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
  level?: 'error' | 'warning' | 'info' | 'debug';
}

/**
 * Track errors to Sentry with context
 * Use this helper function to consistently track errors across the application
 */
export function trackError(
  error: Error | string,
  context?: ErrorContext
) {
  const errorObj = typeof error === 'string' 
    ? new Error(error) 
    : error;
  
  // Set user context if provided
  if (context?.userId || context?.userEmail) {
    Sentry.setUser({
      id: context.userId,
      email: context.userEmail,
      role: context.userRole,
    });
  }
  
  // Capture exception with context
  Sentry.captureException(errorObj, {
    level: context?.level || 'error',
    tags: {
      ...(context?.action && { action: context.action }),
      ...(context?.resource && { resource: context.resource }),
    },
    extra: context?.metadata,
  });
}

/**
 * Track API errors with request context
 */
export function trackApiError(
  error: Error | string,
  options: {
    endpoint: string;
    method: string;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    metadata?: Record<string, any>;
  }
) {
  const errorObj = typeof error === 'string' 
    ? new Error(error) 
    : error;
  
  // Set user context
  if (options.userId || options.userEmail) {
    Sentry.setUser({
      id: options.userId,
      email: options.userEmail,
      role: options.userRole,
    });
  }
  
  // Capture with API-specific context
  Sentry.captureException(errorObj, {
    level: 'error',
    tags: {
      endpoint: options.endpoint,
      method: options.method,
      type: 'api_error',
    },
    extra: {
      ...options.metadata,
      endpoint: options.endpoint,
      method: options.method,
    },
  });
}

/**
 * Track validation errors (lower severity)
 */
export function trackValidationError(
  errors: Array<{ field: string; message: string }>,
  context?: {
    endpoint?: string;
    userEmail?: string;
    metadata?: Record<string, any>;
  }
) {
  Sentry.captureMessage('Validation error', {
    level: 'warning',
    tags: {
      type: 'validation_error',
      ...(context?.endpoint && { endpoint: context.endpoint }),
    },
    extra: {
      errors,
      ...context?.metadata,
    },
  });
}

/**
 * Set user context for current scope
 * Call this when user logs in or session is available
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  role?: string;
  name?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    role: user.role,
  });
}

/**
 * Clear user context
 * Call this when user logs out
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * Useful for tracking user actions leading to errors
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'info' | 'warning' | 'error' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user',
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

