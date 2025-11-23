# Payment Tracking Integration Guide

## Overview
This system automatically syncs payment data from Oracle EBS and marks LRs as paid when payments are received.

## How It Works

1. **Automatic Login**: System logs into Oracle EBS using your credentials
2. **CSV Download**: Finds and downloads the payment CSV file
3. **Payment Matching**: Matches payments with LRs using multiple strategies
4. **Auto-Mark as Paid**: Automatically updates LR status when payments are matched

## Setup

### 1. Database Migration
```bash
npx prisma db push
npx prisma generate
```

### 2. Environment Variables
Add to `.env.local`:
```env
ORACLE_EBS_USERNAME=your_username
ORACLE_EBS_PASSWORD=your_password
# Optional: Direct CSV export URL (if you know it)
ORACLE_EBS_CSV_EXPORT_URL=https://knode1.koel.co.in:8443/...
```

### 3. Find CSV Export URL (Optional but Recommended)

**Method 1: Direct URL**
1. Log in to Oracle EBS manually
2. Navigate to the payments/receipts page
3. Click "Export CSV" or similar button
4. Copy the URL from browser address bar
5. Add to `ORACLE_EBS_CSV_EXPORT_URL`

**Method 2: Let System Find It**
- If you don't provide the URL, the system will try to find it automatically
- It searches for CSV export buttons/links on the page
- This may require some adjustments based on your Oracle EBS interface

## Usage

### Option 1: Automatic Sync (Recommended)

**API Endpoint**: `POST /api/payments/sync`

```json
{
  "username": "your_username",
  "password": "your_password",
  "csvExportUrl": "https://...", // optional
  "autoSave": true,  // automatically save matched payments
  "autoMarkPaid": true  // automatically mark LRs as paid
}
```

**What happens:**
1. System logs into Oracle EBS
2. Downloads CSV file
3. Matches payments with LRs
4. Saves matched payments to database
5. Updates LR remarks with payment status (Fully Paid / Partially Paid)

### Option 2: Manual CSV Upload (Fallback)

If automatic download doesn't work, you can manually download the CSV and upload it:

**API Endpoint**: `POST /api/payments/upload-csv`

**Form Data:**
- `file`: CSV file
- `autoSave`: true/false

**Steps:**
1. Log in to Oracle EBS manually
2. Download the payment CSV file
3. Upload it via the API or UI
4. System will match and save payments

## Payment Matching

The system uses these strategies (in order):

1. **LR Number Match** (100% confidence)
   - Matches payment LR number with database LR number

2. **Bill Number Match** (95% confidence)
   - Matches payment bill number with database bill number

3. **Invoice Number Match** (90% confidence)
   - Matches payment invoice number with database invoice number

4. **Amount + Date Match** (70% confidence)
   - Matches payment amount (±5%) and date (±30 days)

## Payment Status Updates

When payments are matched and saved:

- **Fully Paid**: When total payments ≥ LR amount
  - LR remark updated: "Fully Paid"

- **Partially Paid**: When total payments < LR amount
  - LR remark updated: "Partially Paid (Outstanding: ₹X)"

- **Unmatched Payments**: Shown in response for manual review

## CSV Format

The CSV should contain these columns (adjust field names as needed):

- `lrNo` or `LR No` - LR number
- `billNumber` or `Bill Number` - Bill number
- `invoiceNo` or `Invoice No` - Invoice number
- `paymentAmount` or `Amount` - Payment amount
- `paymentDate` or `Date` - Payment date
- `referenceNumber` or `Reference` - Reference number
- `bankName` or `Bank` - Bank name
- `transactionId` or `Transaction ID` - Transaction ID

**Note**: The system is flexible with column names and will try to match common variations.

## API Endpoints

### 1. Sync Payments
```
POST /api/payments/sync
```
Automatically fetch and process payments from Oracle EBS.

### 2. Upload CSV
```
POST /api/payments/upload-csv
```
Manually upload CSV file for processing.

### 3. Get Payments
```
GET /api/payments?lrNo=MT/25-26/1234
```
Query payments with filters.

### 4. Create Payment Manually
```
POST /api/payments
```
Manually create a payment record.

### 5. Save Matched Payments
```
POST /api/payments/save
```
Save matched payments after review.

## Troubleshooting

### Login Fails
- Verify credentials are correct
- Check if Oracle EBS requires 2FA or additional authentication
- The login form selectors may need adjustment (check `lib/services/oracleEBSIntegration.ts`)

### CSV Not Found
- Provide the direct CSV export URL in `ORACLE_EBS_CSV_EXPORT_URL`
- Or use manual CSV upload option
- Check if you have permission to export CSV

### Payments Not Matching
- Review unmatched payments in the response
- Check if LR numbers, bill numbers, or invoice numbers match exactly
- Adjust matching logic in `lib/services/paymentMatching.ts` if needed

### LR Not Marked as Paid
- Ensure `autoMarkPaid: true` in sync request
- Check if payment was successfully saved
- Verify LR amount is set correctly

## Security

- **Never commit credentials to git**
- Store credentials in environment variables only
- Only CEO and MANAGER roles can sync payments
- All payment operations are logged in `PaymentSyncLog`

## Next Steps

1. **Test the integration** with your Oracle EBS credentials
2. **Adjust CSV column mapping** if your CSV has different column names
3. **Create UI components** for easier payment management
4. **Set up scheduled sync** to run automatically daily

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Review the `PaymentSyncLog` table for sync history
3. Test with manual CSV upload first to verify matching logic
4. Adjust selectors in `oracleEBSIntegration.ts` based on your Oracle EBS interface

