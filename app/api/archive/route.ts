import { NextRequest, NextResponse } from 'next/server';
import { getAllArchivedLRs, restoreArchivedLR } from '@/lib/database';

// GET /api/archive - Get all archived LRs
export async function GET() {
  try {
    const archivedLRs = await getAllArchivedLRs();
    return NextResponse.json({ success: true, lrs: archivedLRs });
  } catch (error) {
    console.error('Error fetching archived LRs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch archived LRs' },
      { status: 500 }
    );
  }
}

// POST /api/archive - Restore an archived LR
export async function POST(request: NextRequest) {
  try {
    const { archiveId } = await request.json();
    
    if (!archiveId) {
      return NextResponse.json(
        { success: false, error: 'Archive ID is required' },
        { status: 400 }
      );
    }
    
    const success = await restoreArchivedLR(archiveId);
    
    if (success) {
      return NextResponse.json({ success: true, message: 'LR restored successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to restore LR' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error restoring archived LR:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore archived LR' },
      { status: 500 }
    );
  }
}
