import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get database connection info
    const connectionString = process.env.DATABASE_URL || '';
    
    // Parse the connection string to extract host/region info
    let host = '';
    let region = '';
    
    try {
      const url = new URL(connectionString);
      host = url.hostname;
      
      // Check if it's Railway, Neon, Supabase, etc.
      if (host.includes('railway')) {
        region = 'Railway (Check your dashboard for specific region)';
      } else if (host.includes('neon')) {
        region = 'Neon (Check your dashboard for specific region)';
      } else if (host.includes('supabase')) {
        region = 'Supabase (Check your dashboard for specific region)';
      } else {
        region = 'Custom/Other';
      }
    } catch (e) {
      host = 'Unable to parse';
    }
    
    // Test query to check connection
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      database: {
        host: host,
        region: region,
        queryTime: `${queryTime}ms`,
        connectionStatus: 'Connected',
      },
      note: 'Check your Railway dashboard to ensure both app and database are in the same region.',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      database: {
        connectionStatus: 'Error',
      },
    });
  }
}
