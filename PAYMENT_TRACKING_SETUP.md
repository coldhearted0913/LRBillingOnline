# Payment Tracking Setup Guide

This guide explains how to set up automatic payment tracking from the Koel portal CSV.

## Overview

The payment tracking system allows you to:
- Automatically fetch payment CSV from Koel portal
- Match payments with LRs automatically
- Track outstanding payments
- View payment history per LR
- Set up automated cron jobs for daily sync

## Features

### 1. CSV Payment Sync
- Fetch CSV directly from Koel portal URL
- Support for authenticated URLs (cookies/headers)
- Automatic payment matching with LRs
- Automatic status update when payments are received

### 2. Payment Tracking Dashboard
- View outstanding payments
- Filter by date range and vehicle type
- Export outstanding payments to CSV
- View payment history for each LR

### 3. Automated Sync (Cron)
- Set up automated daily sync via cron jobs
- Environment variable configuration
- API key authentication for security

## Setup Instructions

### Option 1: Manual CSV Sync via Dashboard

1. **Access Payment Tracking Dashboard**
   - Navigate to `/payments` page
   - Or click "Payment Tracking" button in the header (CEO/MANAGER only)

2. **Configure CSV URL**
   - Click "Configure CSV Sync" button
   - Enter the CSV URL from Koel portal
   - Example: `https://knode1.koel.co.in:8443/.../payments.csv`
   - If authentication is required:
     - Check "Requires Authentication"
     - Enter Auth Cookie (e.g., `session_id=...`)
     - Or enter Authorization Header (e.g., `Bearer token...`)

3. **Test CSV URL**
   - Click "Test URL" to verify the CSV is accessible
   - Check the result to see how many records are found

4. **Sync Payments**
   - Click "Sync Now" to fetch and process payments
   - The system will:
     - Fetch CSV from the URL
     - Match payments with LRs
     - Save payment records
     - Update LR status automatically

### Option 2: Automated Cron Sync

1. **Set Environment Variables**
   Add these to your `.env` file:
   ```env
   PAYMENT_SYNC_CSV_URL=https://knode1.koel.co.in:8443/.../payments.csv
   PAYMENT_SYNC_REQUIRES_AUTH=true
   PAYMENT_SYNC_AUTH_COOKIE=session_id=... (optional)
   PAYMENT_SYNC_AUTH_HEADER=Bearer token... (optional)
   PAYMENT_SYNC_AUTO_MARK_PAID=true
   PAYMENT_SYNC_API_KEY=your-secret-api-key (optional, for cron security)
   ```

2. **Set Up Cron Job**
   - Use a cron service like cron-job.org, EasyCron, or your server's cron
   - Schedule: Daily at a specific time (e.g., 9:00 AM)
   - URL: `https://your-domain.com/api/payments/cron-sync`
   - Method: POST
   - Headers (if API key is set):
     ```
     Authorization: Bearer your-secret-api-key
     ```

3. **Test Cron Endpoint**
   ```bash
   curl -X POST https://your-domain.com/api/payments/cron-sync \
     -H "Authorization: Bearer your-secret-api-key"
   ```

## CSV Format Requirements

The CSV file should contain the following columns (column names are flexible):

**Required:**
- `Invoice No` or `LR No` - Must match LR number format (e.g., MT/25-26/1109)

**Optional:**
- `Payment Date` - Payment date
- `Payment Amount` - Payment amount
- `Bill Number` - Bill number
- `Reference Number` or `Voucher No` - Reference number
- `Bank Name` - Bank name
- `Transaction ID` - Transaction ID

**Example CSV:**
```csv
Invoice No,Payment Date,Payment Amount,Bill Number
MT/25-26/1109,01-12-2024,12484,MT/25-26/1
MT/25-26/1110,01-12-2024,12484,MT/25-26/1
```

## Payment Matching Logic

The system matches payments using multiple strategies:

1. **Invoice Number Match** (Highest Priority)
   - Extracts LR number from invoice number
   - Handles formats like: `MT/25-26/1109-TDS-CM-6432443` → `MT/25-26/1109`

2. **LR Number Match** (Exact)
   - Direct match with LR number

3. **Bill Number Match**
   - Matches by bill number

4. **Amount + Date Match** (Partial)
   - Matches by amount (±5% variance) and date range (±30 days)

## Outstanding Payments Report

Access the outstanding payments report from the Payment Tracking Dashboard:

1. **View Outstanding Payments**
   - Shows all LRs with outstanding amounts
   - Displays: LR No, Date, Vehicle Type, LR Amount, Paid, Outstanding, Payment Count

2. **Filter Options**
   - Filter by date range (Start Date, End Date)
   - Filter by vehicle type (PICKUP, TRUCK, TOROUS)

3. **Export to CSV**
   - Click "Export CSV" to download outstanding payments report

## Payment History

View detailed payment history for any LR:

1. Click the eye icon (👁️) next to any LR in the outstanding payments table
2. View:
   - Payment summary (Total Amount, Paid, Outstanding)
   - All payment records with dates and amounts
   - Credit memos (negative amounts)
   - Payment methods and reference numbers

## Troubleshooting

### CSV URL Not Accessible
- Check if the URL is correct
- Verify authentication credentials
- Check if the CSV file exists on the portal
- Try accessing the URL directly in a browser

### Payments Not Matching
- Verify Invoice No format matches LR No format
- Check if LR numbers exist in the database
- Review unmatched payments list in sync results

### Cron Job Not Working
- Verify environment variables are set correctly
- Check cron service logs
- Test the endpoint manually using curl
- Verify API key is correct (if set)

## Security Notes

- CSV URLs with authentication should use secure methods (HTTPS)
- API keys for cron jobs should be strong and kept secret
- Payment sync logs are stored in the database for audit purposes
- Only CEO and MANAGER roles can access payment tracking

## API Endpoints

### Manual Sync
- `POST /api/payments/csv-sync` - Sync payments from CSV URL
- `GET /api/payments/csv-sync?csvUrl=...` - Test CSV URL

### Outstanding Payments
- `GET /api/payments/outstanding` - Get outstanding payments report
- Query params: `startDate`, `endDate`, `vehicleType`

### Payment History
- `GET /api/payments/history/[lrNo]` - Get payment history for an LR

### Cron Sync
- `POST /api/payments/cron-sync` - Automated sync endpoint
- `GET /api/payments/cron-sync` - Health check

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review payment sync logs in the database
3. Test CSV URL manually before setting up automation
4. Verify CSV format matches requirements
