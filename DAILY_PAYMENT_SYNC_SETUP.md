# Daily Payment Sync Setup Guide

## Overview

The system automatically syncs payments from Oracle EBS every day at 6 PM. It:
1. Logs into Oracle EBS
2. Navigates to the payment listing page
3. Filters payments by today's date (format: 12-Dec-2025)
4. Clicks on each payment voucher link
5. Exports Excel file from voucher detail page
6. Parses Excel to extract Invoice No and Payment Date
7. Matches Invoice No with LR No in database
8. Updates payment date for matched LRs
9. Displays payment date in admin dashboard

## ⚠️ Important: Privileges Required

**Before setting up, ensure your Oracle EBS account has access to:**
- Payment listing page: `https://knode1.koel.co.in:8443/OA_HTML/OA.jsp?page=/xx_supp/oracle/apps/custom/paymentlisting/webui/PaymentListingSearchPG`
- Export functionality on voucher detail pages

If you see "insufficient privileges" error, contact your Oracle EBS administrator to grant access.

## Environment Variables

Add these to your `.env.local` file (or Railway environment variables):

```env
# Oracle EBS Credentials (REQUIRED)
ORACLE_EBS_USERNAME=your_username
ORACLE_EBS_PASSWORD=your_password

# Optional: Custom payment listing URL
ORACLE_EBS_PAYMENT_LISTING_URL=https://knode1.koel.co.in:8443/OA_HTML/OA.jsp?page=/xx_supp/oracle/apps/custom/paymentlisting/webui/PaymentListingSearchPG&retainAM=Y&addBreadCrumb=N
```

## How It Works

### Scheduled Job
- **Runs daily at 6 PM** (18:00) in Asia/Kolkata timezone
- Automatically initialized when server starts
- Logs all sync attempts in `PaymentSyncLog` table

### Process Flow

1. **Login**: Authenticates with Oracle EBS using credentials
2. **Navigate**: Goes to payment listing page
3. **Filter**: Finds all payments with today's date in "Payment Date" column
4. **Process Vouchers**: For each payment:
   - Clicks on "Payment Voucher No" link
   - Waits for voucher detail page to load
   - Clicks "Export" button
   - Downloads Excel file
   - Parses Excel to extract Invoice No and Payment Date
5. **Match**: Compares Invoice No from Excel with LR No in database
6. **Update**: Saves payment records and updates LR payment date

### Safety Features

- **Rate Limiting**: 15 minutes minimum between syncs
- **Human-like Behavior**: Randomized delays, realistic typing speeds
- **Error Handling**: Continues processing even if one voucher fails
- **Logging**: All sync attempts logged for monitoring

## Manual Sync

You can manually trigger a sync by calling:

```bash
POST /api/payments/daily-sync
```

Or use curl:
```bash
curl -X POST http://localhost:3000/api/payments/daily-sync
```

## Admin Dashboard

The admin dashboard (`/admin`) now shows:
- **Payment Date** column for each LR
- Green highlighted dates when payment is received
- "-" when no payment date is available

## Monitoring

Check sync status:
1. **Database**: Query `PaymentSyncLog` table
2. **Server Logs**: Check console for sync messages
3. **Admin Dashboard**: Payment dates update automatically

## Troubleshooting

### Sync Not Running
- Check environment variables are set
- Verify server is running (scheduler only runs on server)
- Check server logs for initialization messages

### No Payments Found
- Verify today's date format matches Oracle EBS format (12-Dec-2025)
- Check if payments exist for today in Oracle EBS
- Verify account has access to payment listing page

### Excel Export Fails
- Verify "Export" button exists on voucher detail page
- Check if Excel file downloads successfully
- Review server logs for specific errors

### Payments Not Matching
- Verify Invoice No format matches LR No format
- Check if Invoice No contains LR number (e.g., "MT/25-26/1109")
- Review unmatched payments in sync logs

## Timezone Configuration

Default timezone: `Asia/Kolkata`

To change timezone, edit `lib/services/scheduler.ts`:
```typescript
timezone: 'Asia/Kolkata', // Change to your timezone
```

## Security Notes

- **Never commit credentials** to git
- Use environment variables only
- Credentials are only used server-side
- All sync operations are logged

## Next Steps

1. Set environment variables
2. Deploy to production (Railway)
3. Monitor first sync at 6 PM
4. Verify payment dates appear in admin dashboard
5. Review sync logs for any issues

---

**Note**: The system respects Oracle EBS rate limits and includes safety features to prevent account blocking. See `ORACLE_EBS_SAFETY_GUIDE.md` for details.

