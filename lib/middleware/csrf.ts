import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// CSRF token generation and validation
const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate a random CSRF token
export function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Get CSRF token from cookies (for server components)
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value || null;
}

// Set CSRF token in response
export function setCSRFToken(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_TOKEN_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for client-side requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  return response;
}

// Validate CSRF token
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  const method = request.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!headerToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_NAME)?.value;
  if (!cookieToken) {
    return false;
  }

  // Compare tokens (use constant-time comparison to prevent timing attacks)
  return constantTimeEqual(headerToken, cookieToken);
}

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// CSRF middleware for API routes
export function csrfProtection(request: NextRequest): NextResponse | null {
  if (!validateCSRFToken(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    );
  }

  return null; // Continue processing
}

// Note: getCSRFTokenForClient should be called from client-side code only
// Use the useCSRF hook instead for React components

