import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getAllLRs, getLRByNumber } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { selectedLrNos, filters, exportType } = await request.json();
    
    let lrsToExport: any[] = [];
    
    if (exportType === 'selected' && selectedLrNos && selectedLrNos.length > 0) {
      // Export only selected LR numbers
      for (const lrNo of selectedLrNos) {
        const lr = await getLRByNumber(lrNo);
        if (lr) {
          lrsToExport.push(lr);
        }
      }
    } else {
      // Export filtered records based on filters
      const allLRs = await getAllLRs();
      
      let filtered = allLRs;
      
      // Filter by month
      if (filters?.month && filters.month !== 'All Months') {
        filtered = filtered.filter((lr: any) => {
          const lrDate = lr['LR Date'] || '';
          // Dates are in DD-MM-YYYY format
          const dateParts = lrDate.split('-');
          if (dateParts.length === 3) {
            const monthNum = parseInt(dateParts[1], 10);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = monthNames.indexOf(filters.month);
            return monthNum === monthIndex + 1;
          }
          return false;
        });
      }
      
      // Filter by year
      if (filters?.year && filters.year !== 'All Years') {
        filtered = filtered.filter((lr: any) => {
          const lrDate = lr['LR Date'] || '';
          const dateParts = lrDate.split('-');
          if (dateParts.length === 3) {
            return dateParts[2] === filters.year;
          }
          return false;
        });
      }
      
      // Filter by status
      if (filters?.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
        filtered = filtered.filter((lr: any) => {
          return filters.statuses.includes(lr.status || 'LR Done');
        });
      }
      
      // Filter by active status filter (from card clicks)
      if (filters?.activeStatusFilter) {
        filtered = filtered.filter((lr: any) => {
          return (lr.status || 'LR Done') === filters.activeStatusFilter;
        });
      }
      
      // Filter by search query
      if (filters?.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        filtered = filtered.filter((lr: any) => {
          const lrNo = (lr['LR No'] || '').toLowerCase();
          const vehicleNo = (lr['Vehicle Number'] || '').toLowerCase();
          const from = (lr['FROM'] || '').toLowerCase();
          const to = (lr['Consignee'] || '').toLowerCase();
          const consignor = (lr['Consignor'] || '').toLowerCase();
          const consignee = (lr['Consignee'] || '').toLowerCase();
          
          return lrNo.includes(searchLower) ||
                 vehicleNo.includes(searchLower) ||
                 from.includes(searchLower) ||
                 to.includes(searchLower) ||
                 consignor.includes(searchLower) ||
                 consignee.includes(searchLower);
        });
      }
      
      lrsToExport = filtered;
    }
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('LR Records');
    
    // Define columns - only the requested fields
    worksheet.columns = [
      { header: 'LR NO', key: 'lrNo', width: 20 },
      { header: 'LR DATE', key: 'lrDate', width: 15 },
      { header: 'VEHICLE NO', key: 'vehicleNumber', width: 18 },
      { header: 'VEHICLE TYPE', key: 'vehicleType', width: 15 },
      { header: 'FROM', key: 'fromLocation', width: 20 },
      { header: 'TO', key: 'toLocation', width: 30 },
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add data rows - only the requested fields
    lrsToExport.forEach((lr: any) => {
      // Get TO value (first word of consignee, same logic as dashboard)
      const getToValue = (consignee: string): string => {
        if (!consignee || consignee.trim() === '') return '';
        const extractFirstWord = (text: string): string => {
          if (!text) return '';
          let word = '';
          let foundAlpha = false;
          for (const char of text) {
            if (/[a-zA-Z]/.test(char)) {
              word += char;
              foundAlpha = true;
            } else if (foundAlpha) {
              break;
            }
          }
          return word || '';
        };
        const consignees = consignee.split('/').map(c => c.trim());
        const firstWords = consignees.map(c => extractFirstWord(c)).filter(w => w.length > 0);
        return firstWords.length > 0 ? firstWords.join('/') : '';
      };

      worksheet.addRow({
        lrNo: lr['LR No'] || '',
        lrDate: lr['LR Date'] || '',
        vehicleNumber: lr['Vehicle Number'] || '',
        vehicleType: lr['Vehicle Type'] || '',
        fromLocation: lr['FROM'] || '',
        toLocation: getToValue(lr['Consignee'] || ''),
      });
    });
    
    // Format date column
    worksheet.getColumn('lrDate').numFmt = 'dd-mm-yyyy';
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Return as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="LR_Records_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

