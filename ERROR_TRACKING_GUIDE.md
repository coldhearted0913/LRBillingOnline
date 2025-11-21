# Error Tracking & Alerting Implementation Guide

## 📋 Overview

Error tracking and alerting helps you:
- **Catch errors in production** before users report them
- **Get notified immediately** when critical issues occur
- **Track error trends** and patterns
- **Debug faster** with detailed error context
- **Monitor application health** in real-time

---

## 🎯 Use Case: LR Creation Failure

### Scenario
**Problem:** Users are reporting that LR creation sometimes fails, but you don't know:
- When it happens
- Why it happens
- Which users are affected
- How often it occurs

**Current State:**
```typescript
// app/api/lrs/route.ts - Current error handling
catch (error) {
  console.error('[POST /api/lrs] Error creating LR:', error);
  return NextResponse.json(
    { success: false, error: errorMessage },
    { status: 500 }
  );
}
```

**Issues:**
- Errors only logged to console (not visible in production)
- No alerts when errors occur
- No error history or trends
- Can't track which LR numbers failed
- No user context (who was creating the LR?)

**With Error Tracking:**
- ✅ **Real-time alerts** when LR creation fails
- ✅ **Error details** with stack traces and context
- ✅ **User information** (email, role, IP address)
- ✅ **LR data** that caused the error (without sensitive info)
- ✅ **Error frequency** tracking
- ✅ **Trend analysis** (errors increasing/decreasing)

---

## 🛠️ Recommended Tools

### 1. **Sentry** (Recommended)
**Best for:** Next.js applications, comprehensive error tracking

**Features:**
- Automatic error capture
- Source maps for readable stack traces
- User context tracking
- Performance monitoring
- Release tracking
- Alert rules (email, Slack, PagerDuty)

**Pricing:** Free tier: 5,000 events/month

### 2. **LogRocket**
**Best for:** Session replay + error tracking

**Features:**
- Video replay of user sessions
- Console logs and network requests
- Error tracking
- Performance monitoring

**Pricing:** Free tier: 1,000 sessions/month

### 3. **Bugsnag**
**Best for:** Enterprise applications

**Features:**
- Error grouping and deduplication
- Release tracking
- User impact analysis

**Pricing:** Free tier: 7,500 events/month

---

## 📊 Implementation Example (Sentry)

### Step 1: Installation
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Step 2: Configuration Files

#### `sentry.client.config.ts` (Client-side)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Adjust sample rate for performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Capture unhandled promise rejections
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  
  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive fields
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.token;
    }
    return event;
  },
  
  // Set user context
  initialScope: {
    tags: {
      component: "client",
    },
  },
});
```

#### `sentry.server.config.ts` (Server-side)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  tracesSampleRate: 0.1,
  
  // Capture unhandled promise rejections
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove database URLs, API keys, etc.
    if (event.request?.headers) {
      delete event.request.headers.authorization;
    }
    return event;
  },
});
```

### Step 3: Update Error Boundary
```typescript
// components/ErrorBoundary.tsx
import * as Sentry from "@sentry/nextjs";

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // Log to Sentry with context
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
    tags: {
      errorBoundary: true,
    },
  });
  
  this.setState({ error, errorInfo });
}
```

### Step 4: Update API Error Handling
```typescript
// app/api/lrs/route.ts
import * as Sentry from "@sentry/nextjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // ... existing code ...
  } catch (error) {
    // Get user context for better error tracking
    const session = await getServerSession(authOptions);
    
    // Capture error with context
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        endpoint: '/api/lrs',
        method: 'POST',
      },
      user: {
        email: session?.user?.email,
        role: (session?.user as any)?.role,
      },
      extra: {
        lrNo: lrData?.['LR No'],
        vehicleType: lrData?.['Vehicle Type'],
        // Don't include sensitive data
      },
      contexts: {
        request: {
          method: request.method,
          url: request.url,
          headers: {
            // Only include non-sensitive headers
            'user-agent': request.headers.get('user-agent'),
          },
        },
      },
    });
    
    // Return generic error to user
    return NextResponse.json(
      { success: false, error: 'Failed to create LR' },
      { status: 500 }
    );
  }
}
```

### Step 5: Custom Error Tracking Helper
```typescript
// lib/utils/errorTracking.ts
import * as Sentry from "@sentry/nextjs";

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

export function trackError(
  error: Error | string,
  context?: ErrorContext
) {
  const errorObj = typeof error === 'string' 
    ? new Error(error) 
    : error;
  
  Sentry.captureException(errorObj, {
    level: 'error',
    tags: {
      action: context?.action,
      resource: context?.resource,
    },
    user: context?.userId ? {
      id: context.userId,
      email: context.userEmail,
      role: context.userRole,
    } : undefined,
    extra: context?.metadata,
  });
}

// Usage example:
// trackError(new Error('LR creation failed'), {
//   userEmail: session?.user?.email,
//   action: 'CREATE_LR',
//   resource: 'LR',
//   metadata: { lrNo: 'LR-123' }
// });
```

---

## 🔔 Alert Configuration

### Sentry Alert Rules Example

#### 1. **Critical Error Alert**
**Trigger:** When LR creation fails > 5 times in 5 minutes
**Action:** Send email + Slack notification

```
Rule: Error rate > 5 in 5 minutes
Tags: endpoint:/api/lrs, method:POST
Action: 
  - Email: admin@company.com
  - Slack: #alerts channel
  - PagerDuty: Critical priority
```

#### 2. **Database Connection Error**
**Trigger:** Database connection errors
**Action:** Immediate notification

```
Rule: Error message contains "database" OR "connection"
Tags: type:database
Action:
  - Email: devops@company.com
  - SMS: +1234567890
```

#### 3. **Authentication Failures**
**Trigger:** Multiple failed login attempts
**Action:** Security alert

```
Rule: Error rate > 10 in 1 minute
Tags: endpoint:/api/auth, type:authentication
Action:
  - Email: security@company.com
  - Slack: #security channel
```

#### 4. **File Upload Errors**
**Trigger:** S3 upload failures
**Action:** Storage team notification

```
Rule: Error message contains "S3" OR "upload"
Tags: type:file_upload
Action:
  - Email: storage-team@company.com
```

---

## 📈 Monitoring Dashboard

### Key Metrics to Track:

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

4. **Performance**
   - Slow API endpoints
   - Database query performance
   - File generation time

---

## 🎯 Real-World Use Cases

### Use Case 1: LR Creation Failure
**Scenario:** User tries to create LR but gets "Failed to create LR" error

**Without Error Tracking:**
- User reports issue
- You check logs (if accessible)
- Try to reproduce manually
- Debug without context

**With Error Tracking:**
- Sentry captures error immediately
- You see:
  - Exact error: "Database connection timeout"
  - User: john@company.com (MANAGER)
  - LR Data: Vehicle Type: TRUCK, FROM: Mumbai
  - Stack trace pointing to `addLR()` function
  - Database connection pool status
- Alert sent to your team
- You fix the database connection issue
- User never had to report it

### Use Case 2: Bill Generation Failure
**Scenario:** Bulk bill generation fails for 50 LRs

**Without Error Tracking:**
- Users report some bills missing
- You don't know which ones failed
- Manual investigation required

**With Error Tracking:**
- Sentry shows:
  - 50 errors in 2 minutes
  - All from `/api/generate-bills`
  - Pattern: All TRUCK type vehicles
  - Error: "Excel template file not found"
- Root cause: Template file missing for TRUCK type
- Fix: Add missing template
- Re-run generation

### Use Case 3: S3 Upload Failures
**Scenario:** File uploads intermittently failing

**Without Error Tracking:**
- Users report upload issues
- No pattern visible
- Hard to debug

**With Error Tracking:**
- Sentry shows:
  - Errors spike during peak hours (10 AM - 12 PM)
  - Error: "S3 rate limit exceeded"
  - Affected: Large file uploads (>5MB)
- Root cause: S3 rate limiting
- Fix: Implement retry logic with exponential backoff
- Monitor: Track upload success rate

### Use Case 4: Authentication Issues
**Scenario:** Users can't log in

**Without Error Tracking:**
- Users report login failures
- No visibility into cause

**With Error Tracking:**
- Sentry shows:
  - Spike in authentication errors
  - Error: "JWT token expired"
  - Pattern: Users with 7+ day old sessions
- Root cause: Session expiry not handled properly
- Fix: Implement token refresh mechanism

---

## 🔒 Security Considerations

### What to Include:
- ✅ Error messages (sanitized)
- ✅ Stack traces
- ✅ User email (not password)
- ✅ User role
- ✅ API endpoint
- ✅ Request method
- ✅ Timestamp

### What to Exclude:
- ❌ Passwords
- ❌ API keys
- ❌ Database connection strings
- ❌ JWT tokens
- ❌ Credit card numbers
- ❌ Personal identification numbers

### Data Filtering:
```typescript
// sentry.server.config.ts
beforeSend(event, hint) {
  // Remove sensitive headers
  if (event.request?.headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      delete event.request.headers[header];
    });
  }
  
  // Remove sensitive request data
  if (event.request?.data) {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    sensitiveFields.forEach(field => {
      if (event.request.data[field]) {
        event.request.data[field] = '[REDACTED]';
      }
    });
  }
  
  return event;
}
```

---

## 📊 Integration with Existing Code

### Current Error Handling Locations:

1. **API Routes** (`app/api/**/*.ts`)
   - Add Sentry.captureException() in catch blocks
   - Add user context from session

2. **Error Boundary** (`components/ErrorBoundary.tsx`)
   - Already has TODO comment
   - Add Sentry.captureException() in componentDidCatch

3. **Client Components**
   - Wrap async operations in try-catch
   - Track errors with user context

4. **Middleware** (`middleware.ts`)
   - Track authentication failures
   - Track rate limit violations

---

## 🚀 Quick Start Checklist

- [ ] Sign up for Sentry account (free tier)
- [ ] Install Sentry SDK: `npm install @sentry/nextjs`
- [ ] Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Add SENTRY_DSN to environment variables
- [ ] Update ErrorBoundary to capture errors
- [ ] Add error tracking to critical API routes
- [ ] Configure alert rules in Sentry dashboard
- [ ] Test error capture (trigger test error)
- [ ] Set up Slack/Email notifications
- [ ] Create monitoring dashboard

---

## 💰 Cost Estimation

### Sentry Free Tier:
- 5,000 events/month
- 1 project
- 7-day data retention
- Email alerts

### Sentry Team Tier ($26/month):
- 50,000 events/month
- Unlimited projects
- 90-day data retention
- Slack/PagerDuty integration
- Performance monitoring

**For your application:** Free tier should be sufficient initially. Upgrade if you exceed 5,000 errors/month.

---

## 📝 Next Steps

1. **Review this guide** and decide on tool (Sentry recommended)
2. **Set up Sentry account** (5 minutes)
3. **Install and configure** (15 minutes)
4. **Add error tracking** to critical endpoints (30 minutes)
5. **Configure alerts** (15 minutes)
6. **Test and monitor** (ongoing)

---

**Ready to implement?** Let me know and I'll help you set it up step by step!

