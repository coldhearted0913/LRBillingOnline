import { NextResponse } from 'next/server';

// Health check endpoint to verify environment variables
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing',
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing',
      S3_REGION: process.env.S3_REGION ? '✅ Set' : '❌ Missing',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? '✅ Set' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
}

