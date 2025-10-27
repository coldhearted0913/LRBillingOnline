# Demo Mode Setup Guide

## 🎯 Purpose
Demo Mode allows visitors to experience your LR Billing System with **FAKE data** while keeping your **PRODUCTION data completely secure**.

## 🔒 Security Architecture

### Complete Data Isolation
- **Separate Databases**: Demo uses a completely different PostgreSQL instance
- **No Cross-Access**: Demo mode cannot query production database
- **Flag-Based Routing**: All queries automatically route to correct database
- **Zero Risk**: Even if demo database is compromised, your real data is safe

### Protection Layers
1. **Environment Level**: Different `DATABASE_URL` for demo
2. **Code Level**: `getPrismaClient()` wrapper checks `DEMO_MODE` flag
3. **Data Level**: Demo database seeded with fake data only

---

## 📋 Setup Instructions

### Step 1: Create Demo Database
```bash
# Option A: Create new database on Railway
1. Go to Railway dashboard
2. Create new PostgreSQL service
3. Copy the connection URL
4. Note: This is completely separate from your production DB

# Option B: Create on Neon (Free tier available)
1. Go to neon.tech
2. Create new project
3. Copy the connection string
```

### Step 2: Configure Environment Variables

**For Demo Deployment:**
```env
# Demo database (separate from production)
DEMO_DATABASE_URL="postgresql://demo-user:demo-pass@demo-db-host.com:5432/demo-db"

# Enable demo mode
DEMO_MODE=true

# Keep other env vars for app functionality
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-demo-app.up.railway.app"

# AWS (for file generation demo)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="demo-bucket"  # Use separate bucket or same
```

**For Production Deployment:**
```env
# Production database (your real data)
DATABASE_URL="postgresql://prod-user:prod-pass@prod-db-host.com:5432/prod-db"

# Demo mode disabled
DEMO_MODE=false

# Keep all production settings
```

### Step 3: Seed Demo Database

```bash
# Connect to demo database
npx prisma db push --schema=./prisma/schema.prisma

# Run seed script (to be created)
npm run db:seed:demo
```

### Step 4: Deploy Demo Instance

On Railway or Vercel:
1. Create new project
2. Connect your repository
3. Add all environment variables from Step 2
4. Deploy

### Step 5: Update All API Routes

Replace `prisma` imports with the wrapper:

**Before:**
```typescript
import { prisma } from '@/lib/prisma';
```

**After:**
```typescript
import { prisma } from '@/lib/prisma-wrapper';
```

---

## 🎨 User Experience

### Demo Login Credentials
Provide these on your demo site:

```
Username: demo@test.com
Password: demo123

Username: manager@test.com  
Password: demo123

Username: worker@test.com
Password: demo123
```

### Demo Banner
Add a banner to your layout:
```typescript
{isDemoMode() && (
  <div className="bg-yellow-500 text-center p-2">
    🎭 DEMO MODE - All data is fake and resets automatically
  </div>
)}
```

---

## 🔐 Security Checklist

- [ ] Demo database is completely separate instance
- [ ] `DEMO_MODE=true` only on demo deployment
- [ ] Production never touches demo database
- [ ] Demo database seeded with fake data only
- [ ] No real customer data in demo
- [ ] API routes use `getPrismaClient()` wrapper
- [ ] Session tokens include demo flag
- [ ] AWS S3 uses separate bucket (optional)

---

## 🚨 Critical Rules

1. **NEVER** set `DEMO_MODE=true` on production
2. **NEVER** use production `DATABASE_URL` for demo
3. **NEVER** seed real customer data in demo
4. **ALWAYS** test demo mode in isolated environment first

---

## 📊 What Visitors Can Do in Demo

✅ Login with demo credentials  
✅ Create/edit/delete LR records (fake data)  
✅ Generate bills (stored in demo database)  
✅ View dashboard (shows demo statistics)  
✅ All features work identically to production  

❌ Cannot access your real data  
❌ Cannot modify production database  
❌ Changes reset after demo session ends  

---

## 🔄 Auto-Reset (Optional)

You can add a cron job to reset demo database daily:

```typescript
// lib/demo-reset.ts
export async function resetDemoData() {
  if (isDemoMode()) {
    await demoPrisma.lR.deleteMany();
    await seedDemoData();
  }
}
```

---

## 💡 Why This Approach is Secure

1. **Physical Separation**: Demo and production databases are on different servers
2. **Code Separation**: Flag-based routing ensures queries go to right place
3. **No Connection**: Demo code cannot connect to production DB even if modified
4. **Zero Trust**: Demo users have no access to production credentials

This is the **industry standard** for demo environments.
