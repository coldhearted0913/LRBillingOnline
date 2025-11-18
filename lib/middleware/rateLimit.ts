import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store (for single-instance deployments)
// For production with multiple instances, use Redis
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (let i = 0; i < entries.length; i++) {
    const [key, entry] = entries[i];
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}

const defaultKeyGenerator = (req: NextRequest): string => {
  // Use IP address as default key
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return ip;
};

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = options;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: message,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;

    // Return null to continue (rate limit not exceeded)
    return null;
  };
}

// Pre-configured rate limiters for different endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'API rate limit exceeded. Please try again later.',
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});

export const billGenerationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 bill generations per hour
  message: 'Bill generation rate limit exceeded. Please try again later.',
});

export const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 uploads per 5 minutes
  message: 'Upload rate limit exceeded. Please try again later.',
});

