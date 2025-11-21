# Sentry Error Tracking Setup Guide

## 📋 Prerequisites

1. Create a Sentry account at https://sentry.io/signup/
2. Create a new project in Sentry (choose "Next.js" as the platform)

## 🔧 Setup Steps

### Step 1: Get Your Sentry DSN

1. Go to your Sentry project settings
2. Navigate to **Settings > Projects > [Your Project] > Client Keys (DSN)**
3. Copy the **DSN** (it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 2: Add Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug

# Optional: Sentry Auth Token (for source maps upload)
# SENTRY_AUTH_TOKEN=your-auth-token
```

**Note:** 
- `NEXT_PUBLIC_SENTRY_DSN` is used for client-side error tracking
- `SENTRY_DSN` is used for server-side error tracking
- Both can be the same DSN value
- `SENTRY_ORG` and `SENTRY_PROJECT` are needed for source map uploads

### Step 3: Verify Installation

1. Restart your development server
2. Trigger a test error (e.g., create an invalid LR)
3. Check your Sentry dashboard - you should see the error appear within seconds

## 🎯 What's Already Implemented

### ✅ Error Tracking Locations

1. **Error Boundary** (`components/ErrorBoundary.tsx`)
   - Captures React component errors
   - Includes component stack traces

2. **API Routes**
   - `/api/lrs` - LR creation, fetching, deletion
   - `/api/generate-bills` - Bill generation
   - `/api/auth/register` - User registration
   - `/api/lrs/[lrNo]/attachments` - File uploads

3. **Error Context**
   - User email and role
   - Endpoint and method
   - Relevant metadata (LR numbers, vehicle types, etc.)
   - No sensitive data (passwords, tokens, etc.)

### ✅ Security Features

- Sensitive data filtering (passwords, tokens, database URLs)
- Header sanitization
- Request data sanitization
- Only non-sensitive metadata included

## 📊 Setting Up Alerts

### 1. Critical Error Alert

**When:** Error rate > 5 in 5 minutes  
**Tags:** `endpoint:/api/lrs`, `method:POST`  
**Actions:**
- Email notification
- Slack notification (if configured)

**Setup in Sentry:**
1. Go to **Alerts > Create Alert Rule**
2. Set condition: "The number of events in a period is greater than 5"
3. Set period: "5 minutes"
4. Add filter: `endpoint:/api/lrs` AND `method:POST`
5. Add actions: Email, Slack

### 2. Database Connection Errors

**When:** Error message contains "database" or "connection"  
**Actions:** Immediate notification

**Setup:**
1. Create alert rule
2. Condition: "An event is seen"
3. Filter: `message:*database*` OR `message:*connection*`
4. Add actions: Email, SMS (if configured)

### 3. Authentication Failures

**When:** Error rate > 10 in 1 minute  
**Tags:** `endpoint:/api/auth`  
**Actions:** Security team notification

**Setup:**
1. Create alert rule
2. Condition: "The number of events in a period is greater than 10"
3. Period: "1 minute"
4. Filter: `endpoint:/api/auth`
5. Add actions: Email security team

## 🔍 Monitoring Dashboard

### Key Metrics to Track

1. **Error Rate**
   - Total errors per hour/day
   - Error rate by endpoint
   - Error rate by user role

2. **Error Types**
   - Database errors
   - Validation errors
   - Authentication errors
   - File upload errors

3. **User Impact**
   - Affected users count
   - Errors by user role
   - Most common user actions before errors

### Creating a Dashboard

1. Go to **Dashboards > Create Dashboard**
2. Add widgets:
   - Error count over time
   - Errors by endpoint
   - Errors by user role
   - Top error messages
   - Affected users

## 🧪 Testing Error Tracking

### Test Client-Side Errors

1. Open browser console
2. Run: `throw new Error('Test error from console')`
3. Check Sentry dashboard - should appear within seconds

### Test Server-Side Errors

1. Try creating an LR with invalid data
2. Check Sentry dashboard for the error
3. Verify user context and metadata are included

### Test Error Boundary

1. Temporarily break a React component
2. Trigger the component
3. Check Sentry for the error boundary error

## 📝 Usage Examples

### Track Custom Errors

```typescript
import { trackError } from '@/lib/utils/errorTracking';

try {
  // Your code
} catch (error) {
  trackError(error, {
    action: 'CREATE_LR',
    resource: 'LR',
    userEmail: session?.user?.email,
    metadata: { lrNo: 'LR-123' }
  });
}
```

### Track API Errors

```typescript
import { trackApiError } from '@/lib/utils/errorTracking';

trackApiError(error, {
  endpoint: '/api/lrs',
  method: 'POST',
  userEmail: session?.user?.email,
  userRole: session?.user?.role,
  metadata: { lrNo: 'LR-123' }
});
```

### Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/utils/errorTracking';

addBreadcrumb('User clicked Create LR button', 'user_action', 'info');
addBreadcrumb('Form validation passed', 'validation', 'info');
```

## 🚀 Production Deployment

### Before Deploying

1. ✅ Verify `SENTRY_DSN` is set in production environment
2. ✅ Verify `NEXT_PUBLIC_SENTRY_DSN` is set in production environment
3. ✅ Test error tracking in staging environment
4. ✅ Configure alert rules
5. ✅ Set up notification channels (email, Slack)

### Source Maps (Optional)

For readable stack traces in production:

1. Get Sentry Auth Token from **Settings > Account > Auth Tokens**
2. Add to environment: `SENTRY_AUTH_TOKEN=your-token`
3. Source maps will be uploaded automatically during build

## 📞 Support

- Sentry Documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Sentry Support: https://sentry.io/support/

## ✅ Checklist

- [ ] Sentry account created
- [ ] Project created in Sentry
- [ ] DSN added to environment variables
- [ ] Test error triggered and verified in Sentry
- [ ] Alert rules configured
- [ ] Notification channels set up
- [ ] Dashboard created
- [ ] Team members added to Sentry project

---

**Ready to go!** Your application now has comprehensive error tracking. Errors will be captured automatically and you'll be notified when issues occur.

