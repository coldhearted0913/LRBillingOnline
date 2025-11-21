# PDF Generation Guide

## Overview

The application now supports generating PDF files from Excel LR documents for better cross-platform consistency. PDFs ensure identical rendering across Windows, macOS, and Linux systems.

## Features

1. **Automatic PDF Generation**: When generating bills, PDF versions are automatically created alongside Excel files
2. **Cross-Platform Compatibility**: PDFs render identically on all platforms
3. **Dual Format Support**: Both Excel (.xlsx) and PDF (.pdf) files are available for download

## How It Works

### PDF Generation Methods

The system uses two methods (in order of preference):

1. **LibreOffice Headless** (Preferred)
   - Most reliable for Excel to PDF conversion
   - Preserves formatting and layout accurately
   - Requires LibreOffice to be installed on the server

2. **Puppeteer Fallback**
   - Converts Excel to HTML, then to PDF
   - Works if LibreOffice is not available
   - Requires Chrome/Chromium (bundled with Puppeteer)

### File Generation

When you generate bills:
- Excel files are created first (`.xlsx`)
- PDF files are automatically generated (`.pdf`)
- Both files are saved in the same directory
- Both files are available for download

## API Response

The `/api/generate-bills` endpoint now returns:

```json
{
  "success": true,
  "files": {
    "lrFile": "DD-MM-YYYY/LR-MT_25-26_1234.xlsx",
    "invoiceFile": "DD-MM-YYYY/INVOICE-MT_25-26_1234.xlsx",
    "lrPdfFile": "DD-MM-YYYY/LR-MT_25-26_1234.pdf",
    "invoicePdfFile": "DD-MM-YYYY/INVOICE-MT_25-26_1234.pdf"
  }
}
```

## Downloading Files

### Excel Files
- URL: `/api/download-file?path=DD-MM-YYYY/LR-MT_25-26_1234.xlsx`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### PDF Files
- URL: `/api/download-file?path=DD-MM-YYYY/LR-MT_25-26_1234.pdf`
- Content-Type: `application/pdf`

## Deployment Requirements

### For Railway/Production

1. **LibreOffice** (Recommended)
   - Add to `nixpacks.toml`: `nixPkgs = ["libreoffice"]`
   - Provides best PDF quality and formatting

2. **Puppeteer** (Fallback)
   - Already included in `package.json`
   - Automatically downloads Chromium
   - Works if LibreOffice is unavailable

### Local Development

1. **Windows/Mac**: Install LibreOffice for best results
2. **Linux**: LibreOffice usually pre-installed
3. **Fallback**: Puppeteer will work automatically

## Benefits of PDF

1. **Consistent Rendering**: Identical appearance on all devices
2. **Universal Compatibility**: Opens on any device without Excel
3. **Print-Ready**: Optimized for printing
4. **Non-Editable**: Prevents accidental modifications
5. **Smaller File Size**: Often more compact than Excel files

## Troubleshooting

### PDF Generation Fails

1. Check server logs for error messages
2. Verify LibreOffice is installed (if using that method)
3. Check Puppeteer installation (if using fallback)
4. Excel files will still be available even if PDF generation fails

### PDF Quality Issues

- LibreOffice provides the best quality
- If using Puppeteer, ensure Chrome/Chromium is properly installed
- Check that Excel files have proper formatting before conversion

## Future Enhancements

- Option to generate only PDF (skip Excel)
- Custom PDF templates
- Batch PDF generation optimization
- PDF compression options

