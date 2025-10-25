import { NextRequest, NextResponse } from 'next/server';
import { getAllLRs } from '@/lib/database';

// Force dynamic rendering - this route uses request-specific data
export const dynamic = 'force-dynamic';

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

    // Get all LRs and filter for additional entries with matching bill number
    const allLRs = await getAllLRs();
    console.log(`[Additional Bills] Total LRs: ${allLRs.length}, Searching for billNo: ${billNo}`);
    
    const additionalEntries = allLRs.filter(lr => 
      lr['LR No']?.startsWith('ADDITIONAL-') &&
      lr['Bill Number'] === billNo
    );
    
    console.log(`[Additional Bills] Found ${additionalEntries.length} entries for bill ${billNo}`);

    // Convert back to original format for display
    const formattedEntries = additionalEntries.map(entry => ({
      'Submission Date': entry['Bill Submission Date'],
      'LR Date': entry['LR Date'],
      'LR No': entry['LR No']?.replace('ADDITIONAL-', ''),
      'Vehicle No': entry['Vehicle Number'],
      'Vehicle Type': entry['Vehicle Type'],
      'FROM': entry['FROM'],
      'Delivery Locations': entry['Delivery Locations'] || [],
      'Amount': entry['Amount'] || 0,
    }));

    console.log('[Additional Bills] Formatted entries:', formattedEntries);

    return NextResponse.json({
      success: true,
      entries: formattedEntries
    });

  } catch (error) {
    console.error('Error fetching additional bill entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch additional bill entries' },
      { status: 500 }
    );
  }
}
