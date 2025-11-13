import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This endpoint is designed to be called by Vercel Cron or external cron services
// Vercel Cron: Add to vercel.json
// External Cron: Use services like cron-job.org, EasyCron, etc.

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron service (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if CRON_SECRET is set and validate it
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Call the weekly bill done notifications endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/whatsapp/send-weekly-bill-done`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cronSecret ? { 'Authorization': `Bearer ${cronSecret}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Failed to send notifications',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly bill done notifications triggered successfully',
      ...data,
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to trigger weekly bill done notifications',
      },
      { status: 500 }
    );
  }
}

