import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, apiRateLimit, authRateLimit, billGenerationRateLimit, uploadRateLimit } from './rateLimit';
import { csrfProtection } from './csrf';

// Determine which rate limiter to use based on route
function getRateLimiter(pathname: string): ReturnType<typeof rateLimit> | null {
  // Auth routes - stricter limits
  if (pathname.startsWith('/api/auth/')) {
    return authRateLimit;
  }

  // Bill generation - moderate limits
  if (
    pathname.startsWith('/api/generate-bills') ||
    pathname.startsWith('/api/rework-bills/generate') ||
    pathname.startsWith('/api/additional-bills/generate')
  ) {
    return billGenerationRateLimit;
  }

  // Upload routes - moderate limits
  if (
    pathname.startsWith('/api/attachments') ||
    pathname.includes('/upload')
  ) {
    return uploadRateLimit;
  }

  // Default API rate limit for other routes
  if (pathname.startsWith('/api/')) {
    return apiRateLimit;
  }

  return null;
}

// Routes that don't need CSRF protection
const CSRF_EXEMPT_ROUTES = [
  '/api/csrf-token',
  '/api/auth/[...nextauth]',
  '/api/health',
];

// Routes that don't need rate limiting
const RATE_LIMIT_EXEMPT_ROUTES = [
  '/api/health',
  '/api/csrf-token',
];

export async function applyApiMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting
  if (!RATE_LIMIT_EXEMPT_ROUTES.some((route) => pathname.startsWith(route))) {
    const limiter = getRateLimiter(pathname);
    if (limiter) {
      const rateLimitResponse = await limiter(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
  }

  // Apply CSRF protection for state-changing methods
  if (
    !CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route)) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    const csrfResponse = csrfProtection(request);
    if (csrfResponse) {
      return csrfResponse;
    }
  }

  // Continue processing
  return null;
}

