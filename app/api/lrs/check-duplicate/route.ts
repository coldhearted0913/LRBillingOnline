import { NextRequest, NextResponse } from 'next/server';

// Ensure this route is always dynamic to avoid static generation bailouts during build
export const dynamic = 'force-dynamic';
import { getLRByNumber } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lrNo = searchParams.get('lrNo');
    const excludeLrNo = searchParams.get('excludeLrNo'); // For edit mode
    
    if (!lrNo) {
      return NextResponse.json(
        { success: false, error: 'LR number is required' },
        { status: 400 }
      );
    }
    
    const existingLR = await getLRByNumber(lrNo);
    
    // If checking for edit, exclude the current LR number
    if (excludeLrNo && existingLR && existingLR['LR No'] === excludeLrNo) {
      return NextResponse.json({ success: true, exists: false });
    }
    
    return NextResponse.json({ 
      success: true, 
      exists: !!existingLR,
      lr: existingLR || null
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check duplicate' },
      { status: 500 }
    );
  }
}

