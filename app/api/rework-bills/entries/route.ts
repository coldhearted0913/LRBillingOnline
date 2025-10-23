import { NextRequest, NextResponse } from 'next/server';
import { getAllLRs } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billNo = searchParams.get('billNo');

    if (!billNo) {
      return NextResponse.json(
        { success: false, error: 'Missing billNo parameter' },
        { status: 400 }
      );
    }

    // Get all LRs and filter for rework entries with matching bill number
    const allLRs = await getAllLRs();
    console.log(`[Rework Bills] Total LRs: ${allLRs.length}, Searching for billNo: ${billNo}`);
    
    const reworkEntries = allLRs.filter(lr => 
      lr['LR No']?.startsWith('REWORK-') &&
      lr['Bill Number'] === billNo
    );
    
    console.log(`[Rework Bills] Found ${reworkEntries.length} entries for bill ${billNo}`);

    // Convert back to original format for display
    const formattedEntries = reworkEntries.map(entry => ({
      'Submission Date': entry['Bill Submission Date'],
      'LR Date': entry['LR Date'],
      'LR No': entry['LR No']?.replace('REWORK-', ''),
      'Vehicle No': entry['Vehicle Number'],
      'Vehicle Type': entry['Vehicle Type'],
      'FROM': entry['FROM'],
      'TO': entry['TO'],
      'Amount': entry['Amount'] || 0,
    }));

    console.log('[Rework Bills] Formatted entries:', formattedEntries);

    return NextResponse.json({
      success: true,
      entries: formattedEntries
    });

  } catch (error) {
    console.error('Error fetching rework bill entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rework bill entries' },
      { status: 500 }
    );
  }
}
