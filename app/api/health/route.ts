import { NextResponse } from 'next/server';

// Health check endpoint to verify environment variables
// SECURITY: Only expose status, not actual values or presence of sensitive env vars
export async function GET() {
  // Check if critical env vars are set (without exposing which ones)
  const criticalVarsSet = !!(
    process.env.DATABASE_URL &&
    process.env.NEXTAUTH_SECRET
  );
  
  return NextResponse.json({
    status: criticalVarsSet ? 'ok' : 'error',
    // Only expose non-sensitive information
    nodeEnv: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    // Don't expose which specific env vars are missing (security best practice)
  });
}

