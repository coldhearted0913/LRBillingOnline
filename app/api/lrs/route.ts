import { NextRequest, NextResponse } from 'next/server';
import { getAllLRs, addLR, deleteMultipleLRs, getLRsByMonth } from '@/lib/database';

// GET /api/lrs - Get all LRs or filter by month
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    let lrs;
    if (year && month) {
      lrs = await getLRsByMonth(parseInt(year), parseInt(month));
    } else {
      lrs = await getAllLRs();
    }
    
    return NextResponse.json({ success: true, lrs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LRs' },
      { status: 500 }
    );
  }
}

// POST /api/lrs - Create new LR
export async function POST(request: NextRequest) {
  try {
    const lrData = await request.json();
    
    // Validate required fields
    if (!lrData['LR No'] || !lrData['LR Date'] || !lrData['Vehicle Type']) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const success = await addLR(lrData);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'LR created successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to create LR' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create LR' },
      { status: 500 }
    );
  }
}

// DELETE /api/lrs - Delete multiple LRs
export async function DELETE(request: NextRequest) {
  try {
    const { lrNumbers } = await request.json();
    
    if (!Array.isArray(lrNumbers) || lrNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid LR numbers' },
        { status: 400 }
      );
    }
    
    const success = await deleteMultipleLRs(lrNumbers);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'LRs deleted successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete LRs' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete LRs' },
      { status: 500 }
    );
  }
}

