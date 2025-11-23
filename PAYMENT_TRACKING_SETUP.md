# Payment Tracking Integration with Oracle EBS

## Overview
This feature automatically syncs payment data from Oracle EBS system and matches it with LRs in the database.

## Setup Instructions

### 1. Database Migration
Run the following command to add the Payment and PaymentSyncLog tables:

```bash
npx prisma db push
# or
npx prisma migrate dev --name add_payment_tracking
```

### 2. Environment Variables
Add the following to your `.env.local` file:

```env
# Oracle EBS Integration
ORACLE_EBS_USERNAME=your_username
ORACLE_EBS_PASSWORD=your_password
ORACLE_EBS_CSV_EXPORT_URL=https://knode1.koel.co.in:8443/... (optional)
```

### 3. CSV Export URL Configuration
You need to find the direct URL to the CSV export page in Oracle EBS:

1. Log in to Oracle EBS manually
2. Navigate to the payment/receipts page
3. Click on the CSV export button/link
4. Copy the URL from the browser address bar
5. Add it to `ORACLE_EBS_CSV_EXPORT_URL` in `.env.local`

**Note:** If you don't provide the CSV export URL, the system will attempt to find it automatically, but this may require adjustments based on your Oracle EBS interface.

## API Endpoints

### 1. Sync Payments from Oracle EBS
**POST** `/api/payments/sync`

**Request Body:**
```json
{
  "username": "oracle_username",
  "password": "oracle_password",
  "csvExportUrl": "https://...", // optional
  "autoSave": false // if true, automatically saves matched payments
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payments synced successfully",
  "syncLogId": "...",
  "stats": {
    "total": 100,
    "matched": 85,
    "unmatched": 15,
    "saved": 85
  },
  "matched": [...],
  "unmatched": [...]
}
```

### 2. Get Payments
**GET** `/api/payments?lrNo=MT/25-26/1234&startDate=2024-01-01&endDate=2024-12-31`

**Query Parameters:**
- `lrNo` - Filter by LR number
- `lrId` - Filter by LR ID
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `status` - Payment status (verified, pending, disputed)

### 3. Create Payment Manually
**POST** `/api/payments`

**Request Body:**
```json
{
  "lrNo": "MT/25-26/1234",
  "paymentAmount": 50000,
  "paymentDate": "2024-01-15",
  "paymentMethod": "Bank Transfer",
  "referenceNumber": "TXN123456",
  "bankName": "HDFC Bank",
  "notes": "Payment received"
}
```

### 4. Save Matched Payments
**POST** `/api/payments/save`

**Request Body:**
```json
{
  "matchedPayments": [
    {
      "payment": { ... },
      "lrId": "...",
      "lrNo": "...",
      "matchType": "exact"
    }
  ]
}
```

## Payment Matching Logic

The system uses multiple strategies to match payments with LRs:

1. **Exact Match by LR Number** (Confidence: 100%)
   - Matches payment LR number with database LR number

2. **Exact Match by Bill Number** (Confidence: 95%)
   - Matches payment bill number with database bill number

3. **Exact Match by Invoice Number** (Confidence: 90%)
   - Matches payment invoice number with database invoice number

4. **Partial Match by Amount + Date** (Confidence: 70%)
   - Matches payment amount (±5% variance) and date (±30 days)

## Database Schema

### Payment Model
- `id` - Unique identifier
- `lrId` - Reference to LR (nullable)
- `lrNo` - LR number (for reference)
- `billNumber` - Bill number
- `invoiceNo` - Invoice number
- `paymentAmount` - Payment amount
- `paymentDate` - Payment date
- `paymentMethod` - Payment method
- `referenceNumber` - Reference/transaction number
- `bankName` - Bank name
- `transactionId` - Transaction ID
- `status` - Payment status (verified, pending, disputed)
- `source` - Source (oracle_ebs, manual)
- `notes` - Additional notes
- `syncedAt` - When payment was synced
- `syncedBy` - User who synced

### PaymentSyncLog Model
- Tracks each sync operation
- Records total, matched, and unmatched counts
- Stores error messages if sync fails

## Usage Workflow

1. **Initial Setup:**
   - Configure Oracle EBS credentials in `.env.local`
   - Find and configure CSV export URL (optional but recommended)

2. **Sync Payments:**
   - Call `/api/payments/sync` with credentials
   - Review matched and unmatched payments
   - If `autoSave: false`, manually review and save using `/api/payments/save`

3. **View Payments:**
   - Use `/api/payments` to query payments
   - Filter by LR number, date range, or status

4. **Manual Entry:**
   - Use `/api/payments` POST to manually add payments
   - Useful for unmatched payments or manual corrections

## Troubleshooting

### Login Issues
- Verify credentials are correct
- Check if Oracle EBS requires additional authentication (2FA, etc.)
- The login form selectors may need adjustment based on your Oracle EBS version

### CSV Download Issues
- Ensure you have the correct CSV export URL
- Check if Oracle EBS requires specific permissions to export
- Verify the download path is writable

### Matching Issues
- Review unmatched payments manually
- Adjust matching logic in `lib/services/paymentMatching.ts`
- Consider adding custom matching rules for your specific use case

## Security Notes

- **Never commit Oracle EBS credentials to git**
- Store credentials in environment variables only
- Consider using a secrets management service for production
- The sync endpoint requires CEO or MANAGER role

## Next Steps

1. Create UI components for:
   - Payment sync interface
   - Payment list/view
   - Payment status indicators on LR cards
   - Outstanding payments dashboard

2. Add scheduled sync:
   - Create a cron job to automatically sync payments daily
   - Add to `app/api/cron/payment-sync/route.ts`

3. Add payment reconciliation:
   - Compare total payments vs total LR amounts
   - Generate reconciliation reports

4. Add notifications:
   - Notify when payments are received
   - Alert on unmatched payments

