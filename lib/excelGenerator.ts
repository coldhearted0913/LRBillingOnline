import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { LRData } from './database';
import { VEHICLE_AMOUNTS } from './constants';
import { computeReworkAmount } from './utils';
import puppeteer from 'puppeteer';

const INVOICE_DIR = path.join(process.cwd(), 'invoices');
const TEMPLATES_DIR = process.cwd(); // Current directory for templates

// Ensure invoice directory exists
const ensureInvoiceDir = (submissionDate: string) => {
  const folder = path.join(INVOICE_DIR, submissionDate);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  return folder;
};

// Helper function to extract first alphabetic word from text
const extractFirstWord = (text: string): string => {
  if (!text) return '';
  let word = '';
  let foundAlpha = false;
  
  for (let char of text) {
    if (/[a-zA-Z]/.test(char)) {
      word += char;
      foundAlpha = true;
    } else if (foundAlpha) {
      break;
    }
  }
  
  return word || '';
};

// Get display TO value from consignee (same logic as dashboard)
const getToValue = (consignee: string): string => {
  if (!consignee || consignee.trim() === '') return '';
  const consignees = consignee.split('/').map(c => c.trim());
  const firstWords = consignees.map(c => extractFirstWord(c)).filter(w => w.length > 0);
  return firstWords.length > 0 ? firstWords.join('/') : '';
};

// Format date to DD-MM-YYYY consistently across all Excel files
const formatDateToDDMMYYYY = (date: string | Date): string => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    // If already in DD-MM-YYYY, validate and return as-is
    const ddMmYyyyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date);
    if (ddMmYyyyMatch) {
      const [, day, month, year] = ddMmYyyyMatch;
      // Validate and return normalized (ensure 2-digit day/month)
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
    // If in YYYY-MM-DD format, convert
    const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (yyyyMmDdMatch) {
      const [, year, month, day] = yyyyMmDdMatch;
      return `${day}-${month}-${year}`;
    }
    // If in DD/MM/YYYY format, convert
    const ddSlashMmSlashYyyyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
    if (ddSlashMmSlashYyyyMatch) {
      const [, day, month, year] = ddSlashMmSlashYyyyMatch;
      return `${day}-${month}-${year}`;
    }
    // Try parsing as date string
    d = new Date(date);
    if (isNaN(d.getTime())) return date; // Invalid date, return as-is
  } else {
    d = date;
  }
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Copy template file
// Simple in-memory cache for template buffers to avoid disk I/O per LR
const templateBufferCache: Record<string, Buffer> = Object.create(null);
const getTemplate = async (templateName: string): Promise<ExcelJS.Workbook> => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  if (!fs.existsSync(templatePath)) {
    const errorMsg = `Template not found: ${templateName} at ${templatePath}. Current working directory: ${process.cwd()}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  let buf = templateBufferCache[templateName];
  if (!buf) {
    buf = fs.readFileSync(templatePath);
    templateBufferCache[templateName] = buf;
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  return workbook;
};

// Generate LR file from SAMPLE.xlsx
export const generateLRFile = async (
  lrData: LRData,
  submissionDate: string,
  signatureImagePath?: string // NEW: Optional signature parameter
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('SAMPLE.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Template worksheet not found');
  
  // Cell mapping
  const cellMap: { [key: string]: string } = {
    'LR Date': 'F8',
    'Vehicle Type': 'F12',
    'Vehicle Number': 'F14',
    'LR No': 'F18',
    'Koel Gate Entry No': 'F20',
    'Koel Gate Entry Date': 'F22',
    'Weightslip No': 'F24',
    'Loaded Weight': 'F26',
    'Empty Weight': 'F28',
    'Total No of Invoices': 'F30',
    'Invoice No': 'F32',
    'GRR No': 'F34',
    'GRR Date': 'F36',
  };
  
  // Fill cells
  Object.entries(cellMap).forEach(([field, cell]) => {
    let value = lrData[field as keyof LRData] || '';
    
    // Special handling for date fields
    if (field === 'LR Date' || field === 'Koel Gate Entry Date' || field === 'GRR Date') {
      value = formatDateToDDMMYYYY(String(value));
    }
    
    // Special handling
    if (field === 'Loaded Weight' || field === 'Empty Weight') {
      if (value && !isNaN(Number(value))) {
        value = `${value} KG`;
      }
    }
    
    if (field === 'Koel Gate Entry No' && !lrData['Consignor']?.includes('KOEL')) {
      value = '99';
    }
    
    if (value) {
      worksheet.getCell(cell).value = value.toString().toUpperCase();
      
      // Make LR No bold
      if (cell === 'F18') {
        worksheet.getCell(cell).font = { bold: true };
      }
    }
  });
  
  // Cell F6: Write TO value (first word of consignee)
  const toValue = getToValue(lrData['Consignee'] || '');
  if (toValue) {
    worksheet.getCell('F6').value = toValue.toUpperCase();
  }
  
  // Improve cross-platform compatibility
  // Set explicit page setup for consistent rendering
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait' as const,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };
  
  // Set explicit fonts that are available on both Windows and macOS
  // Use Arial (available on both platforms) as fallback
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.font) {
        // Ensure font family is set to a cross-platform font
        if (!cell.font.name || cell.font.name === 'Calibri') {
          cell.font = { ...cell.font, name: 'Arial' };
        }
      }
    });
  });
  
  // Save file
  const safeFileName = lrData['LR No'].replace(/[\/\\:*?"<>|]/g, '-');
  const filePath = path.join(folder, `${safeFileName}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate Mangesh Transport Invoice
export const generateMangeshInvoice = async (
  lrData: LRData,
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('MANGESH TRANSPORT BILLING INVOICE COPY-1.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Invoice template worksheet not found');
  
  const vehicleType = lrData['Vehicle Type'];
  const amount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
  
  // Fill invoice data
  if (lrData['Invoice No']) {
    worksheet.mergeCells('C14:D14');
    worksheet.getCell('C14').value = lrData['Invoice No'];
  }
  
  // Amount in words (simple conversion)
  const amountWords = numberToWords(amount).toUpperCase() + ' RUPEES ONLY';
  worksheet.mergeCells('A37:D37');
  worksheet.getCell('A37').value = amountWords;
  
  // Other fields
  worksheet.getCell('E7').value = lrData['LR No'];
  worksheet.getCell('E8').value = formatDateToDDMMYYYY(new Date());
  worksheet.getCell('E10').value = lrData['Vehicle Number'] || '';
  worksheet.getCell('E11').value = vehicleType;
  
  const amountStr = `${amount}/-RS`;
  worksheet.getCell('E14').value = amountStr;
  worksheet.getCell('E39').value = amountStr;
  
  // Save file
  const safeFileName = lrData['LR No'].replace(/[\/\\:*?"<>|]/g, '-');
  const filePath = path.join(folder, `inv_${safeFileName}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Update Final Submission Sheet
export const resetFinalSubmissionSheet = async (submissionDate: string): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  const finalSheetPath = path.join(folder, 'Final Submission Sheet.xlsx');
  // Load fresh template and overwrite any existing file
  const freshWb = await getTemplate('Final Submission Sheet.xlsx');
  await freshWb.xlsx.writeFile(finalSheetPath);
  return finalSheetPath;
};

export const updateFinalSubmissionSheet = async (
  lrData: LRData,
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  const finalSheetPath = path.join(folder, 'Final Submission Sheet.xlsx');
  
  let workbook: ExcelJS.Workbook;
  
  // Create or load Final Submission Sheet
  if (fs.existsSync(finalSheetPath)) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(finalSheetPath);
  } else {
    // Copy from template
    const templatePath = path.join(TEMPLATES_DIR, 'Final Submission Sheet.xlsx');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Final Submission Sheet template not found');
    }
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
  }
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('Final Submission Sheet worksheet not found');
  
  // Find vehicle heading row
  const vehicleType = lrData['Vehicle Type'];
  let headingRow = 0;
  
  console.log('[FINAL-SHEET] Looking for vehicle type:', vehicleType);
  
  for (let r = 1; r <= worksheet.rowCount; r++) {
    const cellValue = worksheet.getCell(r, 1).value?.toString().trim().toUpperCase();
    if (cellValue === vehicleType.toUpperCase()) {
      headingRow = r;
      console.log(`[FINAL-SHEET] Found vehicle type "${vehicleType}" at row ${r}`);
      break;
    }
  }
  
  if (!headingRow) {
    throw new Error(`Vehicle type ${vehicleType} heading not found in Final Submission Sheet`);
  }
  
  // Find insertion row (after header, before next vehicle type or empty)
  let insertRow = headingRow + 2; // Skip heading and header row
  const vehicleHeadings = ['PICKUP', 'TRUCK', 'TOROUS'];
  
  console.log(`[FINAL-SHEET] Starting insertion search from row ${insertRow}`);
  
  while (insertRow <= worksheet.rowCount + 1) {
    const cellVal = worksheet.getCell(insertRow, 1).value?.toString().trim().toUpperCase();
    const cell2Val = worksheet.getCell(insertRow, 2).value;
    
    // If we hit another vehicle heading, insert here
    if (cellVal && vehicleHeadings.includes(cellVal)) {
      console.log(`[FINAL-SHEET] Hit another vehicle heading "${cellVal}", inserting at row ${insertRow}`);
      break;
    }
    
    // If row is empty, insert here
    if (!cell2Val) {
      console.log(`[FINAL-SHEET] Found empty row, inserting at row ${insertRow}`);
      break;
    }
    
    insertRow++;
  }
  
  console.log(`[FINAL-SHEET] Inserting LR ${lrData['LR No']} at row ${insertRow}`);
  
  // Insert new row
  worksheet.insertRow(insertRow, []);
  
  // Copy formatting from header row (first data row after vehicle heading)
  const headerRow = headingRow + 1; // Header row is right after vehicle heading
  const sourceRow = worksheet.getRow(headerRow);
  const targetRow = worksheet.getRow(insertRow);
  
  // Copy all cell formatting (borders, fonts, fills, alignment, etc.)
  sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);
    if (cell.style) {
      // Copy font but exclude bold
      let fontStyle = undefined;
      if (cell.style.font) {
        fontStyle = {
          ...cell.style.font,
          bold: false, // Never copy bold, always use regular weight
        };
      }
      
      targetCell.style = {
        ...cell.style,
        font: fontStyle,
        border: cell.style.border ? { ...cell.style.border } : undefined,
        fill: cell.style.fill ? { ...cell.style.fill } : undefined,
        alignment: cell.style.alignment ? { ...cell.style.alignment } : undefined,
        numFmt: cell.style.numFmt,
      };
    }
  });
  
  // Copy row height if it exists
  if (sourceRow.height) {
    targetRow.height = sourceRow.height;
  }
  
  // Calculate serial number
  let srNo = 1;
  if (insertRow > headingRow + 2) {
    const prevSrNo = worksheet.getCell(insertRow - 1, 1).value;
    if (prevSrNo && !isNaN(Number(prevSrNo))) {
      srNo = Number(prevSrNo) + 1;
    }
  }
  
  // Fill row data
  const amount = VEHICLE_AMOUNTS[vehicleType as keyof typeof VEHICLE_AMOUNTS] || 0;
  
  worksheet.getCell(insertRow, 1).value = srNo; // Sr No
  worksheet.getCell(insertRow, 2).value = lrData['LR No'].toUpperCase(); // LR No
  worksheet.getCell(insertRow, 3).value = formatDateToDDMMYYYY(lrData['LR Date']).toUpperCase(); // LR Date
  worksheet.getCell(insertRow, 4).value = (lrData['Vehicle Number'] || '').toUpperCase(); // Vehicle No
  worksheet.getCell(insertRow, 5).value = amount; // Amount
  worksheet.getCell(insertRow, 6).value = lrData['LR No'].toUpperCase(); // Bill No
  
  console.log(`[FINAL-SHEET] Written row ${insertRow}:`, {
    srNo,
    lrNo: lrData['LR No'],
    vehicleType: vehicleType,
    amount
  });
  
  // Update submission date
  worksheet.getCell('B5').value = formatDateToDDMMYYYY(submissionDate);
  
  // Save file
  await workbook.xlsx.writeFile(finalSheetPath);
  console.log(`[FINAL-SHEET] Saved to: ${finalSheetPath}`);
  
  return finalSheetPath;
};

// Generate all files for an LR
export const generateAllFilesForLR = async (
  lrData: LRData,
  submissionDate: string,
  signatureImagePath?: string // NEW: Optional signature parameter
): Promise<{ lrFile: string; invoiceFile: string; finalSheet: string }> => {
  try {
    const lrFile = await generateLRFile(lrData, submissionDate, signatureImagePath);
    const invoiceFile = await generateMangeshInvoice(lrData, submissionDate);
    const finalSheet = await updateFinalSubmissionSheet(lrData, submissionDate);
    
    return { lrFile, invoiceFile, finalSheet };
  } catch (error) {
    console.error('Error generating files for LR:', lrData['LR No'], error);
    throw error;
  }
};

// Variant without updating Final Submission Sheet (for batch writes)
export const generateAllFilesForLRNoFinal = async (
  lrData: LRData,
  submissionDate: string,
  signatureImagePath?: string,
  generatePDF: boolean = true
): Promise<{ lrFile: string; invoiceFile: string; lrPdfFile?: string; invoicePdfFile?: string }> => {
  // Generate Excel files - use generateLRFromMasterCopy for better formatting
  const lrFile = await generateLRFromMasterCopy(lrData, submissionDate);
  const invoiceFile = await generateMangeshInvoice(lrData, submissionDate);
  
  const result: { lrFile: string; invoiceFile: string; lrPdfFile?: string; invoicePdfFile?: string } = {
    lrFile,
    invoiceFile,
  };
  
  // Generate PDF files if requested
  if (generatePDF) {
    // Generate PDFs in parallel and wait for completion
    try {
      const [lrPdf, invoicePdf] = await Promise.all([
        generatePDFFromExcel(lrFile).catch(err => {
          console.error('[PDF] Failed to generate LR PDF:', err);
          return null;
        }),
        generatePDFFromExcel(invoiceFile).catch(err => {
          console.error('[PDF] Failed to generate Invoice PDF:', err);
          return null;
        })
      ]);
      
      if (lrPdf) result.lrPdfFile = lrPdf;
      if (invoicePdf) result.invoicePdfFile = invoicePdf;
    } catch (error) {
      console.error('[PDF] PDF generation error:', error);
      // Continue even if PDF generation fails - Excel files are still available
    }
  }
  
  return result;
};

// Batch append to Final Submission Sheet for a set of LRs
export const appendFinalSubmissionSheetBatch = async (
  lrs: LRData[],
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  const finalSheetPath = path.join(folder, 'Final Submission Sheet.xlsx');

  let workbook: ExcelJS.Workbook;
  if (fs.existsSync(finalSheetPath)) {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(finalSheetPath);
  } else {
    const wb = await getTemplate('Final Submission Sheet.xlsx');
    await wb.xlsx.writeFile(finalSheetPath);
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(finalSheetPath);
  }

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('Final Submission Sheet worksheet not found');

  const vehicleHeadings = ['PICKUP', 'TRUCK', 'TOROUS'];

  const findHeadingRow = (vehicleType: string): number => {
    for (let r = 1; r <= worksheet.rowCount; r++) {
      const cellValue = worksheet.getCell(r, 1).value?.toString().trim().toUpperCase();
      if (cellValue === vehicleType.toUpperCase()) return r;
    }
    return 0;
  };

  const findInsertRow = (headingRow: number): number => {
    let insertRow = headingRow + 2; // after header row
    while (insertRow <= (worksheet.lastRow?.number || insertRow)) {
      const v = worksheet.getCell(insertRow, 1).value?.toString().trim().toUpperCase();
      const b = worksheet.getCell(insertRow, 2).value; // LR No
      if (v && vehicleHeadings.includes(v)) break; // next section
      if (!b) break; // empty row
      insertRow++;
    }
    return insertRow;
  };

  for (const lrData of lrs) {
    const vehicleType = lrData['Vehicle Type'];
    const headingRow = findHeadingRow(vehicleType);
    if (!headingRow) continue;
    const insertRow = findInsertRow(headingRow);

    worksheet.insertRow(insertRow, []);
    // copy formatting from header row (headingRow+1)
    const sourceRow = worksheet.getRow(headingRow + 1);
    const targetRow = worksheet.getRow(insertRow);
    sourceRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const t = targetRow.getCell(col) as any;
      const s: any = cell;
      if (s && s.style) {
        t.style = { ...s.style, font: s.style?.font ? { ...s.style.font, bold: false } : undefined };
      }
    });

    // serial number
    let srNo = 1;
    if (insertRow > headingRow + 2) {
      const prev = worksheet.getCell(insertRow - 1, 1).value;
      if (prev && !isNaN(Number(prev))) srNo = Number(prev) + 1;
    }

    const amount = (VEHICLE_AMOUNTS as any)[vehicleType] || 0;
    worksheet.getCell(insertRow, 1).value = srNo;
    worksheet.getCell(insertRow, 2).value = lrData['LR No'] || '';
    worksheet.getCell(insertRow, 3).value = formatDateToDDMMYYYY(lrData['LR Date'] || '');
    worksheet.getCell(insertRow, 4).value = (lrData['Vehicle Number'] || '').toString();
    worksheet.getCell(insertRow, 5).value = amount;
    worksheet.getCell(insertRow, 6).value = lrData['LR No'] || '';
  }

  worksheet.getCell('B5').value = formatDateToDDMMYYYY(submissionDate);
  await workbook.xlsx.writeFile(finalSheetPath);
  return finalSheetPath;
};

// Simple number to words converter (basic version)
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  let words = '';
  
  // Lakhs
  if (num >= 100000) {
    words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  
  // Thousands
  if (num >= 1000) {
    words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds
  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  // Tens and ones
  if (num >= 20) {
    words += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    words += teens[num - 10] + ' ';
    return words.trim();
  }
  
  if (num > 0) {
    words += ones[num] + ' ';
  }
  
  return words.trim();
}

// Generate Rework Bill from REWORK BILL Format.xlsx
export const generateReworkBill = async (data: any, submissionDate: string): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('REWORK BILL Format.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Rework Bill template worksheet not found');
  
  // Get entries array (if multiple entries) or single entry
  const entries = data.allEntries || [data];
  
  // Put Bill No in C2 (once for all entries)
  worksheet.getCell(2, 3).value = data['Bill No'] || '';
  
  // Start from row 4 and add each entry below the previous one
  let currentRow = 4;
  
  entries.forEach((entry: any, index: number) => {
    // Fill in the data for each entry
    // Column A - Leave empty
    // If current row has a REWORK label in column A, skip to next row
    const aCellVal = worksheet.getCell(currentRow, 1).value as any;
    const aCellText = typeof aCellVal === 'string'
      ? aCellVal
      : aCellVal?.richText
        ? aCellVal.richText.map((t: any) => t.text).join('')
        : aCellVal?.toString?.() || '';
    if (aCellText.toString().toUpperCase().includes('REWORK')) {
      currentRow += 1;
    }

    worksheet.getCell(currentRow, 2).value = index + 1; // Column B - Auto-increment serial number starting from 1
    worksheet.getCell(currentRow, 3).value = formatDateToDDMMYYYY(entry['LR Date'] || ''); // C - LR Date
    // Clean LR No: remove any existing MT/25-26/ prefix(es) and add it once
    const lrNo = entry['LR No'] || '';
    const cleanLrNo = lrNo.replace(/^(MT\/25-26\/)+/, ''); // Remove all leading MT/25-26/ prefixes
    const formattedLrNo = cleanLrNo ? `MT/25-26/${cleanLrNo}` : '';
    worksheet.getCell(currentRow, 4).value = formattedLrNo; // D - LR No
    worksheet.getCell(currentRow, 5).value = entry['Vehicle No'] || ''; // E - Vehicle No
    worksheet.getCell(currentRow, 6).value = entry['Vehicle Type'] || ''; // F - Vehicle Type
    worksheet.getCell(currentRow, 7).value = entry['FROM'] || ''; // G - FROM
    worksheet.getCell(currentRow, 8).value = entry['TO'] || ''; // H - TO
    // Use provided Amount (pre-computed server-side as 80% for rework)
    const providedAmount = Number.isFinite(parseFloat(entry['Amount'])) ? parseFloat(entry['Amount']) : 0;
    // Write amount only in I column; ensure J stays blank
    worksheet.getCell(currentRow, 9).value = providedAmount; // I - Amount
    // Add an audit note with vehicle type, base, and effective amounts
    try {
      const { base, effective } = computeReworkAmount(entry['Vehicle Type'] || '');
      const note = `Vehicle: ${(entry['Vehicle Type'] || '').toString()}\nBase: ${base}\nRework(80%): ${effective}`;
      (worksheet.getCell(currentRow, 9) as any).note = note;
    } catch {}
    worksheet.getCell(currentRow, 10).value = null; // J - keep empty for data rows

    // Copy border from previous row to maintain table styling
    if (currentRow > 4) {
      const prevRow = worksheet.getRow(currentRow - 1);
      const thisRow = worksheet.getRow(currentRow);
      for (let c = 1; c <= 10; c++) {
        const prevCell: any = prevRow.getCell(c);
        const cell: any = thisRow.getCell(c);
        if (prevCell && prevCell.border) {
          cell.border = { ...prevCell.border };
        }
      }
    }
    
    // Move to next row for next entry
    currentRow++;
  });
  
  // Extract just the bill number (remove MT/25-26/ prefix if present)
  const billNoOnly = data['Bill No'].replace('MT/25-26/', '').replace(/\//g, '_');
  
  // Save the file
  const fileName = `REWORK_BILL_MT_25-26_${billNoOnly}.xlsx`;
  const filePath = path.join(folder, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate Additional Bill from Additional Bill Format.xlsx
export const generateAdditionalBill = async (data: any, submissionDate: string): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('Additional Bill Format.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Additional Bill template worksheet not found');
  
  // Get entries array (if multiple entries) or single entry
  const entries = data.allEntries || [data];
  
  // Put Bill No in C2 (once for all entries)
  worksheet.getCell(2, 3).value = data['Bill No'] || '';
  
  // Start from row 4 and add each entry below the previous one
  let currentRow = 4;
  
  entries.forEach((entry: any, index: number) => {
    // Fill in the data for each entry
    // Column A - Leave empty
    worksheet.getCell(currentRow, 2).value = index + 1; // Column B - Auto-increment serial number starting from 1
    worksheet.getCell(currentRow, 3).value = formatDateToDDMMYYYY(entry['LR Date'] || ''); // C - LR Date
    // Clean LR No: remove any existing MT/25-26/ prefix(es) and add it once
    const lrNo = entry['LR No'] || '';
    const cleanLrNo = lrNo.replace(/^(MT\/25-26\/)+/, ''); // Remove all leading MT/25-26/ prefixes
    const formattedLrNo = cleanLrNo ? `MT/25-26/${cleanLrNo}` : '';
    worksheet.getCell(currentRow, 4).value = formattedLrNo; // D - LR No
    worksheet.getCell(currentRow, 5).value = entry['Vehicle No'] || ''; // E - Vehicle No
    worksheet.getCell(currentRow, 6).value = entry['Vehicle Type'] || ''; // F - Vehicle Type
    worksheet.getCell(currentRow, 7).value = entry['FROM'] || ''; // G - FROM
    // H - Destination: Extract first words from delivery locations (same logic as dashboard TO column)
    const deliveryLocations = entry['Delivery Locations'] || [];
    const firstWords = deliveryLocations.map((location: string) => extractFirstWord(location)).filter((w: string) => w.length > 0);
    worksheet.getCell(currentRow, 8).value = firstWords.join('/') || ''; // H - Destination
    worksheet.getCell(currentRow, 9).value = entry['Amount'] || 0; // I - Amount
    worksheet.getCell(currentRow, 10).value = null; // ensure J stays blank

    // Copy border from previous row for consistent styling
    if (currentRow > 4) {
      const prevRow = worksheet.getRow(currentRow - 1);
      const thisRow = worksheet.getRow(currentRow);
      for (let c = 1; c <= 10; c++) {
        const prevCell: any = prevRow.getCell(c);
        const cell: any = thisRow.getCell(c);
        if (prevCell && prevCell.border) {
          cell.border = { ...prevCell.border };
        }
      }
    }
    
    // Move to next row for next entry
    currentRow++;
  });
  
  // Extract just the bill number (remove MT/25-26/ prefix if present)
  const billNoOnly = data['Bill No'].replace('MT/25-26/', '').replace(/\//g, '_');
  
  // Save the file
  const fileName = `ADDITIONAL_BILL_MT_25-26_${billNoOnly}.xlsx`;
  const filePath = path.join(folder, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate Mangesh Transport Invoice for Rework Bills
export const generateMangeshInvoiceForRework = async (
  data: any,
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('MANGESH TRANSPORT BILLING INVOICE COPY-1.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Invoice template worksheet not found');
  
  // Calculate total amount from all entries
  const entries = data.allEntries || [data];
  const totalAmount = entries.reduce((sum: number, entry: any) => {
    const parsedProvided = parseFloat(entry['Amount']);
    const amountVal = Number.isFinite(parsedProvided) && parsedProvided > 0 ? parsedProvided : 0;
    return sum + amountVal;
  }, 0);
  
  // Fill invoice data
  // Bill No in E7
  worksheet.getCell('E7').value = data['Bill No'] || '';
  
  // Submission Date in E8
  worksheet.getCell('E8').value = formatDateToDDMMYYYY(submissionDate);
  
  // Write N/A in E10 and E11
  worksheet.getCell('E10').value = 'N/A';
  worksheet.getCell('E11').value = 'N/A';
  
  // Write 'As per attached annexure' in C14
  worksheet.getCell('C14').value = 'As per attached annexure';
  
  // Amount in E14 and E39
  const amountStr = `${totalAmount}/-RS`;
  worksheet.getCell('E14').value = amountStr;
  worksheet.getCell('E39').value = amountStr;
  
  // Amount in words in A37
  const amountWords = numberToWords(totalAmount).toUpperCase() + ' RUPEES ONLY';
  worksheet.mergeCells('A37:D37');
  worksheet.getCell('A37').value = amountWords;
  
  // Extract just the bill number for filename
  const billNoOnly = data['Bill No'].replace('MT/25-26/', '').replace(/\//g, '_');
  
  // Save file
  const fileName = `REWORK_INV_MT_25-26_${billNoOnly}.xlsx`;
  const filePath = path.join(folder, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate Mangesh Transport Invoice for Additional Bills
export const generateMangeshInvoiceForAdditional = async (
  data: any,
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('MANGESH TRANSPORT BILLING INVOICE COPY-1.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('Invoice template worksheet not found');
  
  // Calculate total amount from all entries
  const entries = data.allEntries || [data];
  const totalAmount = entries.reduce((sum: number, entry: any) => sum + (parseFloat(entry['Amount']) || 0), 0);
  
  // Fill invoice data
  // Bill No in E7
  worksheet.getCell('E7').value = data['Bill No'] || '';
  
  // Submission Date in E8
  worksheet.getCell('E8').value = formatDateToDDMMYYYY(submissionDate);
  
  // Write N/A in E10 and E11
  worksheet.getCell('E10').value = 'N/A';
  worksheet.getCell('E11').value = 'N/A';
  
  // Write 'As per attached annexure' in C14
  worksheet.getCell('C14').value = 'As per attached annexure';
  
  // Amount in E14 and E39
  const amountStr = `${totalAmount}/-RS`;
  worksheet.getCell('E14').value = amountStr;
  worksheet.getCell('E39').value = amountStr;
  
  // Amount in words in A37
  const amountWords = numberToWords(totalAmount).toUpperCase() + ' RUPEES ONLY';
  worksheet.mergeCells('A37:D37');
  worksheet.getCell('A37').value = amountWords;
  
  // Extract just the bill number for filename
  const billNoOnly = data['Bill No'].replace('MT/25-26/', '').replace(/\//g, '_');
  
  // Save file
  const fileName = `ADDITIONAL_INV_MT_25-26_${billNoOnly}.xlsx`;
  const filePath = path.join(folder, fileName);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate Provision Sheet from PROVISION FORMAT.xlsx
export const generateProvisionSheet = async (
  allLrs: LRData[],
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);

  const workbook = await getTemplate('PROVISION FORMAT.xlsx');
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('Provision template worksheet not found');

  const applyFullBorders = (rowNumber: number) => {
    const border = { style: 'thin' as const };
    const row = worksheet.getRow(rowNumber);
    for (let c = 1; c <= 15; c++) { // A..O
      const cell = row.getCell(c);
      cell.border = {
        top: border,
        left: border,
        bottom: border,
        right: border,
      };
    }
  };

  const writeValuesIntoRow = (rowNumber: number, lr: LRData) => {
    // Numeric cells
    worksheet.getCell(`A${rowNumber}`).value = 957599; // number
    worksheet.getCell(`B${rowNumber}`).value = 'Mangesh Transport';
    worksheet.getCell(`C${rowNumber}`).value = lr['LR No'] || '';
    worksheet.getCell(`D${rowNumber}`).value = formatDateToDDMMYYYY(lr['LR Date'] || '');
    worksheet.getCell(`E${rowNumber}`).value = 71; // number
    worksheet.getCell(`F${rowNumber}`).value = 621601; // number
    worksheet.getCell(`G${rowNumber}`).value = 141000; // number
    worksheet.getCell(`H${rowNumber}`).value = 940048; // number
    applyFullBorders(rowNumber);
  };

  const eligible = (allLrs || []).filter(lr => (lr.status || '').toLowerCase() !== 'bill submitted');
  const isRework = (lr: LRData) => (lr['FROM'] || '').toLowerCase() === 'kolhapur' && (lr['TO'] || '').toLowerCase() === 'solapur';
  const rework = eligible.filter(isRework);
  const regular = eligible.filter(lr => !isRework(lr));

  // Sort by LR No ascending (numeric-aware)
  const lrComparator = (a: LRData, b: LRData) => {
    const an = (a['LR No'] || '').toString();
    const bn = (b['LR No'] || '').toString();
    const ai = parseInt(an.replace(/\D/g, ''), 10);
    const bi = parseInt(bn.replace(/\D/g, ''), 10);
    if (!isNaN(ai) && !isNaN(bi) && ai !== bi) return ai - bi;
    return an.localeCompare(bn, undefined, { numeric: true, sensitivity: 'base' });
  };
  regular.sort(lrComparator);
  rework.sort(lrComparator);

  // Helper: month from LR Date (expects DD-MM-YYYY or similar with '-' separators)
  const getMonthIndex = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      return isNaN(m) ? 0 : m; // 1..12
    }
    return 0;
  };
  const MONTH_ABBR = ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  // Regular rows: insert a new row each time at currentRow, so any existing content (including REWORK label) shifts down
  let currentRow = 2;
  const insertedRowNumbers: number[] = [];
  const allOrdered: LRData[] = [];
  for (const lr of regular) {
    worksheet.insertRow(currentRow, []);
    writeValuesIntoRow(currentRow, lr);
    insertedRowNumbers.push(currentRow);
    allOrdered.push(lr);
    currentRow++;
  }

  // Find REWORK anchor in column A
  let reworkAnchorRow = -1;
  const totalRows = Math.max(worksheet.rowCount, currentRow, 100);
  for (let r = 1; r <= totalRows; r++) {
    const v = worksheet.getCell(`A${r}`).value as any;
    const text = typeof v === 'string'
      ? v
      : v?.richText
        ? v.richText.map((t: any) => t.text).join('')
        : v?.toString?.() || '';
    if (text.toString().toUpperCase().includes('REWORK')) {
      reworkAnchorRow = r;
      break;
    }
  }

  if (reworkAnchorRow === -1) {
    reworkAnchorRow = Math.max(currentRow, worksheet.lastRow?.number || 1) + 1;
    worksheet.getCell(`A${reworkAnchorRow}`).value = 'REWORK';
  }

  // Rework rows: insert sequentially starting right below the REWORK label without changing the label cell
  let insertionRow = reworkAnchorRow + 1;
  for (const lr of rework) {
    worksheet.insertRow(insertionRow, []);
    writeValuesIntoRow(insertionRow, lr);
    insertedRowNumbers.push(insertionRow);
    allOrdered.push(lr);
    insertionRow += 1;
  }

  // Build month columns (I.. beyond): header row 1 with month name, values from row 2 down
  // Build month columns (I..): set header once per month, and write value at the actual inserted row for each LR
  const monthLabelsSet = new Set<string>();
  const labelToColumnIndex: Record<string, number> = {};
  let nextMonthCol = 9; // I
  for (let i = 0; i < allOrdered.length; i++) {
    const lr = allOrdered[i];
    const rowNum = insertedRowNumbers[i];
    const monthIdx = getMonthIndex(lr['LR Date'] || '');
    if (monthIdx < 1 || monthIdx > 12) continue;
    const label = MONTH_ABBR[monthIdx];
    if (!monthLabelsSet.has(label)) {
      monthLabelsSet.add(label);
      labelToColumnIndex[label] = nextMonthCol;
      worksheet.getCell(1, nextMonthCol).value = label; // header
      nextMonthCol += 1;
    }
    const col = labelToColumnIndex[label];
    const vehicleType = lr['Vehicle Type'];
    const baseAmount = (VEHICLE_AMOUNTS as any)[vehicleType] || 0;
    const fromVal = (lr['FROM'] || '').toString().trim().toLowerCase();
    const toVal = (lr['TO'] || '').toString().trim().toLowerCase();
    const isReworkRoute = fromVal === 'kolhapur' && toVal === 'solapur';
    const amount = isReworkRoute ? Math.round(baseAmount * 0.8) : baseAmount;
    const cell = worksheet.getCell(rowNum, col);
    cell.value = amount;
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
    } as any;
  }

  // Name file as PROVISION For [Month]
  const dt = new Date(submissionDate);
  const monthName = dt.toLocaleString('en-US', { month: 'long' });
  const filePath = path.join(folder, `PROVISION For ${monthName}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

// Generate LR from LR MASTER COPY.xlsx template
export const generateLRFromMasterCopy = async (
  lrData: LRData,
  submissionDate: string
): Promise<string> => {
  const folder = ensureInvoiceDir(submissionDate);
  
  // Load template
  const workbook = await getTemplate('LR MASTER COPY.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) throw new Error('LR MASTER COPY template worksheet not found');
  
  // Helper function to split text into lines (max 3 lines for Consignor, max 3 lines for Consignee)
  const splitTextIntoLines = (text: string, maxLines: number): string[] => {
    if (!text) return [];
    const upperText = text.toUpperCase().trim();
    // Try to split by common delimiters first
    const parts = upperText.split(/[\/,]/).map(p => p.trim()).filter(p => p);
    if (parts.length > 0 && parts.length <= maxLines) {
      return parts.slice(0, maxLines);
    }
    // If single long text, try to split by length (approximately)
    if (parts.length === 0 || parts.length === 1) {
      const words = upperText.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).length > 40 && currentLine) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
        if (lines.length >= maxLines - 1) {
          break;
        }
      }
      if (currentLine) lines.push(currentLine.trim());
      return lines.slice(0, maxLines);
    }
    return parts.slice(0, maxLines);
  };
  
  // Parse Description of Goods and Quantity (comma-separated) - reusable function
  const parseGoodsAndQuantity = (): Array<{ description: string; quantity: string }> => {
    const descriptions = lrData['Description of Goods'] || '';
    const quantities = lrData['Quantity'] || '';
    
    if (!descriptions && !quantities) return [];
    
    // Split by comma
    const descParts = descriptions.split(',').map(d => d.trim()).filter(d => d);
    const qtyParts = quantities.split(',').map(q => q.trim()).filter(q => q);
    
    const goods: Array<{ description: string; quantity: string }> = [];
    
    // Match descriptions with quantities
    for (let i = 0; i < Math.max(descParts.length, qtyParts.length); i++) {
      const desc = descParts[i] || '';
      const qty = qtyParts[i] || '';
      
      // Check if description contains quantity (format: "Description: Quantity")
      const colonIndex = desc.indexOf(':');
      if (colonIndex !== -1) {
        const descPart = desc.substring(0, colonIndex).trim();
        const qtyPart = desc.substring(colonIndex + 1).trim();
        goods.push({
          description: descPart.toUpperCase(),
          quantity: qtyPart.toUpperCase()
        });
      } else if (desc || qty) {
        goods.push({
          description: desc.toUpperCase(),
          quantity: qty.toUpperCase()
        });
      }
    }
    
    return goods;
  };

  // ========== ORIGINAL MAPPINGS (First Section) ==========
  
  // Map FROM to L7
  if (lrData['FROM']) {
    const cell = worksheet.getCell('L7');
    cell.value = lrData['FROM'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map TO to L8
  if (lrData['TO']) {
    const cell = worksheet.getCell('L8');
    cell.value = lrData['TO'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Consignor to B6-B8 (split by '/' and write each in cell below)
  if (lrData['Consignor']) {
    const consignors = lrData['Consignor'].split('/').map(c => c.trim()).filter(c => c.length > 0);
    const maxConsignors = 3; // B6, B7, B8 = 3 rows max
    const startRow = 6;
    
    for (let i = 0; i < Math.min(consignors.length, maxConsignors); i++) {
      const row = startRow + i;
      const cell = worksheet.getCell(`B${row}`);
      cell.value = consignors[i].toUpperCase();
      // Preserve existing font color - don't override
    }
  }
  
  // Map Consignee to B10-B12 (split by '/' and write each in cell below)
  if (lrData['Consignee']) {
    const consignees = lrData['Consignee'].split('/').map(c => c.trim()).filter(c => c.length > 0);
    const maxConsignees = 3; // B10, B11, B12 = 3 rows max
    const startRow = 10;
    
    for (let i = 0; i < Math.min(consignees.length, maxConsignees); i++) {
      const row = startRow + i;
      const cell = worksheet.getCell(`B${row}`);
      cell.value = consignees[i].toUpperCase();
      // Preserve existing font color - don't override
    }
  }
  
  // Map LR No to L6 (plain text, no formatting)
  if (lrData['LR No']) {
    const cell = worksheet.getCell('L6');
    cell.value = lrData['LR No'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map LR Date to L10
  if (lrData['LR Date']) {
    const cell = worksheet.getCell('L10');
    cell.value = formatDateToDDMMYYYY(lrData['LR Date']).toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Vehicle Type to L12
  if (lrData['Vehicle Type']) {
    const cell = worksheet.getCell('L12');
    cell.value = lrData['Vehicle Type'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Vehicle Number to L11
  if (lrData['Vehicle Number']) {
    const cell = worksheet.getCell('L11');
    cell.value = lrData['Vehicle Number'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Description of Goods and Quantity starting from B15 (up to B23)
  const goodsList1 = parseGoodsAndQuantity();
  const maxGoodsRows1 = 9; // B15 to B23 = 9 rows
  const startRow1 = 15;
  
  for (let i = 0; i < Math.min(goodsList1.length, maxGoodsRows1); i++) {
    const row = startRow1 + i;
    const goods = goodsList1[i];
    
    // Quantity in column A (A15, A16, etc.)
    if (goods.quantity) {
      const cell = worksheet.getCell(`A${row}`);
      cell.value = goods.quantity;
      // Preserve existing font color - don't override
    }
    
    // Description in column B (B15, B16, etc.)
    if (goods.description) {
      const cell = worksheet.getCell(`B${row}`);
      cell.value = goods.description;
      // Preserve existing font color - don't override
    }
  }
  
  // Map Invoice No to B24
  if (lrData['Invoice No']) {
    const cell = worksheet.getCell('B24');
    cell.value = lrData['Invoice No'].toUpperCase();
    // Preserve existing font color - don't override
  }

  // Map GRR No to B26
  if (lrData['GRR No']) {
    const cell = worksheet.getCell('B26');
    cell.value = lrData['GRR No'].toUpperCase();
    // Preserve existing font color - don't override
  }

  // ========== NEW MAPPINGS (Second Section) ==========
  
  // Map FROM to L38
  if (lrData['FROM']) {
    const cell = worksheet.getCell('L38');
    cell.value = lrData['FROM'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map TO to L39
  if (lrData['TO']) {
    const cell = worksheet.getCell('L39');
    cell.value = lrData['TO'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map LR Date to L41
  if (lrData['LR Date']) {
    const cell = worksheet.getCell('L41');
    cell.value = formatDateToDDMMYYYY(lrData['LR Date']).toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Consignor to B37-B39 (split by '/' and write each in cell below)
  if (lrData['Consignor']) {
    const consignors = lrData['Consignor'].split('/').map(c => c.trim()).filter(c => c.length > 0);
    const maxConsignors = 3; // B37, B38, B39 = 3 rows max
    const startRow = 37;
    
    for (let i = 0; i < Math.min(consignors.length, maxConsignors); i++) {
      const row = startRow + i;
      const cell = worksheet.getCell(`B${row}`);
      cell.value = consignors[i].toUpperCase();
      // Preserve existing font color - don't override
    }
  }
  
  // Map Consignee to B41-B43 (split by '/' and write each in cell below)
  if (lrData['Consignee']) {
    const consignees = lrData['Consignee'].split('/').map(c => c.trim()).filter(c => c.length > 0);
    const maxConsignees = 3; // B41, B42, B43 = 3 rows max
    const startRow = 41;
    
    for (let i = 0; i < Math.min(consignees.length, maxConsignees); i++) {
      const row = startRow + i;
      const cell = worksheet.getCell(`B${row}`);
      cell.value = consignees[i].toUpperCase();
      // Preserve existing font color - don't override
    }
  }
  
  // Map LR No to L37
  if (lrData['LR No']) {
    const cell = worksheet.getCell('L37');
    cell.value = lrData['LR No'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Map Vehicle Type to L43
  if (lrData['Vehicle Type']) {
    worksheet.getCell('L43').value = lrData['Vehicle Type'].toUpperCase();
  }
  
  // Map Vehicle Number to L42
  if (lrData['Vehicle Number']) {
    worksheet.getCell('L42').value = lrData['Vehicle Number'].toUpperCase();
  }
  
  // Map Description of Goods and Quantity starting from B46 (up to B54)
  const goodsList2 = parseGoodsAndQuantity();
  const maxGoodsRows2 = 9; // B46 to B54 = 9 rows
  const startRow2 = 46;
  
  for (let i = 0; i < Math.min(goodsList2.length, maxGoodsRows2); i++) {
    const row = startRow2 + i;
    const goods = goodsList2[i];
    
    // Quantity in column A (A46, A47, etc.)
    if (goods.quantity) {
      const cell = worksheet.getCell(`A${row}`);
      cell.value = goods.quantity;
      // Preserve existing font color - don't override
    }
    
    // Description in column B (B46, B47, etc.)
    if (goods.description) {
      const cell = worksheet.getCell(`B${row}`);
      cell.value = goods.description;
      // Preserve existing font color - don't override
    }
  }
  
  // Map Invoice No to B55
  if (lrData['Invoice No']) {
    const cell = worksheet.getCell('B55');
    cell.value = lrData['Invoice No'].toUpperCase();
    // Preserve existing font color - don't override
  }

  // Map GRR No to B57
  if (lrData['GRR No']) {
    const cell = worksheet.getCell('B57');
    cell.value = lrData['GRR No'].toUpperCase();
    // Preserve existing font color - don't override
  }
  
  // Improve cross-platform compatibility
  // Set explicit page setup for consistent rendering
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait' as const,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };
  
  // Set explicit fonts that are available on both Windows and macOS
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.font) {
        // Ensure font family is set to a cross-platform font
        if (!cell.font.name || cell.font.name === 'Calibri') {
          cell.font = { ...cell.font, name: 'Arial' };
        }
      }
    });
  });
  
  // Save file with format: LR-[LRNo].xlsx
  const safeFileName = `LR-${lrData['LR No'].replace(/[\/\\:*?"<>|]/g, '-')}.xlsx`;
  const filePath = path.join(folder, safeFileName);
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
};

// Generate PDF from Excel file using LibreOffice headless (preferred) or Puppeteer fallback
export const generatePDFFromExcel = async (
  excelFilePath: string
): Promise<string | null> => {
  const pdfPath = excelFilePath.replace('.xlsx', '.pdf');
  
  // Method 1: Try LibreOffice headless (most reliable for Excel to PDF)
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Check if LibreOffice is available
    try {
      await execAsync('which libreoffice || which soffice');
    } catch {
      throw new Error('LibreOffice not found');
    }
    
    // Convert Excel to PDF using LibreOffice headless
    const command = `libreoffice --headless --convert-to pdf --outdir "${path.dirname(excelFilePath)}" "${excelFilePath}"`;
    await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    
    // Check if PDF was created
    if (fs.existsSync(pdfPath)) {
      console.log('[PDF] Successfully generated PDF using LibreOffice');
      return pdfPath;
    }
  } catch (error: any) {
    console.log('[PDF] LibreOffice conversion failed, trying Puppeteer:', error.message);
  }
  
  // Method 2: Fallback to Puppeteer (convert Excel to HTML, then to PDF)
  try {
    if (typeof puppeteer === 'undefined') {
      throw new Error('Puppeteer not available');
    }

    // Read Excel file and convert to HTML
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }
    
    // Generate HTML from Excel data
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
          td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          @media print {
            body { margin: 0; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <table>
    `;
    
    // Convert worksheet to HTML table
    worksheet.eachRow((row, rowNumber) => {
      html += '<tr>';
      row.eachCell((cell, colNumber) => {
        const cellValue = cell.value?.toString() || '';
        const tag = rowNumber === 1 ? 'th' : 'td';
        const style = cell.font?.bold ? 'font-weight: bold;' : '';
        html += `<${tag} style="${style}">${cellValue}</${tag}>`;
      });
      html += '</tr>';
    });
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });
      
      await browser.close();
      
      if (fs.existsSync(pdfPath)) {
        console.log('[PDF] Successfully generated PDF using Puppeteer');
        return pdfPath;
      }
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    console.error('[PDF] Puppeteer conversion failed:', error.message);
  }
  
  // If both methods fail, return null
  console.warn('[PDF] All PDF generation methods failed, returning null');
  return null;
};

