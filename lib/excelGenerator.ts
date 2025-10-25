import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { LRData } from './database';
import { VEHICLE_AMOUNTS } from './constants';

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

// Copy template file
const getTemplate = async (templateName: string): Promise<ExcelJS.Workbook> => {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  return workbook;
};

// Generate LR file from SAMPLE.xlsx
export const generateLRFile = async (
  lrData: LRData,
  submissionDate: string
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
  worksheet.getCell('E8').value = new Date().toLocaleDateString('en-GB');
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
  worksheet.getCell(insertRow, 3).value = lrData['LR Date'].toUpperCase(); // LR Date
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
  worksheet.getCell('B5').value = submissionDate;
  
  // Save file
  await workbook.xlsx.writeFile(finalSheetPath);
  console.log(`[FINAL-SHEET] Saved to: ${finalSheetPath}`);
  
  return finalSheetPath;
};

// Generate all files for an LR
export const generateAllFilesForLR = async (
  lrData: LRData,
  submissionDate: string
): Promise<{ lrFile: string; invoiceFile: string; finalSheet: string }> => {
  try {
    const lrFile = await generateLRFile(lrData, submissionDate);
    const invoiceFile = await generateMangeshInvoice(lrData, submissionDate);
    const finalSheet = await updateFinalSubmissionSheet(lrData, submissionDate);
    
    return { lrFile, invoiceFile, finalSheet };
  } catch (error) {
    console.error('Error generating files for LR:', lrData['LR No'], error);
    throw error;
  }
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
    worksheet.getCell(currentRow, 2).value = index + 1; // Column B - Auto-increment serial number starting from 1
    worksheet.getCell(currentRow, 3).value = entry['LR Date'] || ''; // C - LR Date
    // Clean LR No: remove any existing MT/25-26/ prefix(es) and add it once
    const lrNo = entry['LR No'] || '';
    const cleanLrNo = lrNo.replace(/^(MT\/25-26\/)+/, ''); // Remove all leading MT/25-26/ prefixes
    const formattedLrNo = cleanLrNo ? `MT/25-26/${cleanLrNo}` : '';
    worksheet.getCell(currentRow, 4).value = formattedLrNo; // D - LR No
    worksheet.getCell(currentRow, 5).value = entry['Vehicle No'] || ''; // E - Vehicle No
    worksheet.getCell(currentRow, 6).value = entry['Vehicle Type'] || ''; // F - Vehicle Type
    worksheet.getCell(currentRow, 7).value = entry['FROM'] || ''; // G - FROM
    worksheet.getCell(currentRow, 8).value = entry['TO'] || ''; // H - TO
    worksheet.getCell(currentRow, 9).value = entry['Amount'] || 0; // I - Amount
    
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
    worksheet.getCell(currentRow, 3).value = entry['LR Date'] || ''; // C - LR Date
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

