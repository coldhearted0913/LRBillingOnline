# WhatsApp Weekly Notifications Setup

This document explains how to set up weekly WhatsApp notifications for LRs with "LR Done" status.

## Prerequisites

1. **Twilio Account Setup**
   - Create a Twilio account at https://www.twilio.com
   - Get your Account SID and Auth Token from the Twilio Console
   - Set up a WhatsApp-enabled phone number in Twilio
   - Add the following environment variables:
     - `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
     - `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
     - `TWILIO_WHATSAPP_FROM` - Your Twilio WhatsApp number (format: `whatsapp:+1234567890`)

2. **User Phone Numbers**
   - Ensure all users have phone numbers in their profile
   - Phone numbers should be in international format (e.g., `+919876543210` for India)
   - Users can update their phone numbers in the profile settings

3. **Cron Secret (Optional but Recommended)**
   - Set `CRON_SECRET` environment variable for security
   - This prevents unauthorized access to the cron endpoint

## API Endpoints

### 1. Weekly Notifications Endpoint
- **URL**: `/api/whatsapp/weekly-notifications`
- **Method**: `POST`
- **Description**: Sends WhatsApp messages to all active users with phone numbers for LRs with "LR Done" status
- **Authorization**: Optional Bearer token (if `CRON_SECRET` is set)

### 2. Test/Preview Endpoint
- **URL**: `/api/whatsapp/weekly-notifications`
- **Method**: `GET`
- **Description**: Preview the notification message and check configuration without sending

### 3. Cron Trigger Endpoint
- **URL**: `/api/cron/weekly-lr-notifications`
- **Method**: `GET`
- **Description**: Trigger endpoint for cron services (calls the weekly notifications endpoint)

## Setup Options

### Option 1: Vercel Cron (Recommended for Vercel Deployments)

If you're deploying on Vercel, the `vercel.json` file is already configured to run weekly notifications every Monday at 9:00 AM UTC.

**Schedule**: `0 9 * * 1` (Every Monday at 9:00 AM UTC)

To customize the schedule, edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-lr-notifications",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

Cron schedule format: `minute hour day-of-month month day-of-week`

### Option 2: External Cron Service

If you're not using Vercel or want more control, use an external cron service:

1. **cron-job.org** (Free)
   - Go to https://cron-job.org
   - Create a new cron job
   - URL: `https://yourdomain.com/api/cron/weekly-lr-notifications`
   - Schedule: Weekly (e.g., every Monday at 9:00 AM)
   - Method: GET
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET` (if using CRON_SECRET)

2. **EasyCron**
   - Similar setup to cron-job.org
   - URL: `https://yourdomain.com/api/cron/weekly-lr-notifications`

3. **GitHub Actions** (For GitHub-hosted projects)
   - Create `.github/workflows/weekly-notifications.yml`
   - Schedule using cron syntax

### Option 3: Manual Testing

You can manually trigger the notifications:

```bash
# Test endpoint (preview without sending)
curl https://yourdomain.com/api/whatsapp/weekly-notifications

# Send notifications (requires CRON_SECRET if configured)
curl -X POST https://yourdomain.com/api/whatsapp/weekly-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Testing

1. **Check Twilio Configuration**
   ```bash
   curl https://yourdomain.com/api/whatsapp/weekly-notifications
   ```
   This will show you:
   - If Twilio is configured
   - How many LRs with "LR Done" status exist
   - How many users have phone numbers
   - A preview of the message

2. **Test Sending to One User**
   - Use the mobile quick actions in the dashboard
   - Or use the `/api/whatsapp/twilio` endpoint directly

3. **Test Full Weekly Notification**
   - Make a POST request to `/api/whatsapp/weekly-notifications`
   - Check the response for success/failure counts

## Message Format

The weekly notification message includes:
- Total count of LRs with "LR Done" status
- Details for up to 20 LRs (LR No, Date, Vehicle, Route, Consignee)
- Link to check dashboard for complete details

Example message:
```
📋 *Weekly LR Status Update*

You have *5* LR(s) with "LR Done" status:

1. *LR No:* LR-001
   📅 Date: 15-01-2024
   🚚 Vehicle: PICKUP - MH-12-AB-1234
   📍 Route: Kolhapur → Pune
   📦 Consignee: ABC Company

...

Please check the dashboard for complete details.
```

## Troubleshooting

1. **No messages sent**
   - Check Twilio credentials in environment variables
   - Verify users have phone numbers in their profiles
   - Check Twilio console for error logs

2. **Invalid phone number format**
   - Phone numbers should be in international format
   - The system automatically formats: `+91` prefix for 10-digit Indian numbers
   - Ensure phone numbers are stored correctly in the database

3. **Cron not running**
   - Verify `vercel.json` is deployed (for Vercel)
   - Check cron service logs (for external services)
   - Verify `CRON_SECRET` matches if using authorization

4. **Rate Limits**
   - Twilio has rate limits for WhatsApp messages
   - If sending to many users, messages are sent in parallel
   - Check Twilio console for rate limit errors

## Security Notes

- Always set `CRON_SECRET` in production
- Never expose Twilio credentials
- Use environment variables for all sensitive data
- Consider rate limiting for the cron endpoint

