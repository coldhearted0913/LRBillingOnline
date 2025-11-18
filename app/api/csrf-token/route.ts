import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFToken } from '@/lib/middleware/csrf';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Generate new CSRF token
  const token = generateCSRFToken();

  // Create response
  const response = NextResponse.json({ success: true, token });

  // Set token in cookie
  setCSRFToken(response, token);

  return response;
}

