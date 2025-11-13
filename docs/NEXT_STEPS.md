# 🚀 Next Steps to Deploy Demo

## Step 1: Deploy to Vercel (FREE & FAST) ⚡

### 1.1 Sign up for Vercel
```
1. Go to: https://vercel.com/signup
2. Sign up with GitHub
3. Authorize Vercel to access your repositories
```

### 1.2 Import Your Repository
```
1. Click "New Project"
2. Select "LRBillingOnline" repository
3. Click "Import"
```

### 1.3 Configure Environment Variables
Add these in Vercel dashboard:

```env
# Database (you'll create this in Step 2)
DATABASE_URL="your-database-url"

# Auth
NEXTAUTH_SECRET="generate-a-random-32-char-string"
NEXTAUTH_URL="https://your-app.vercel.app"

# AWS (optional for now)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_REGION="ap-south-1"
S3_BUCKET_NAME="your-bucket-name"
```

### 1.4 Deploy
```
1. Click "Deploy"
2. Wait 2-3 minutes
3. Copy your URL: https://your-app.vercel.app
```

---

## Step 2: Set Up Production Database (Railway)

### 2.1 Create Railway Account
```
1. Go to: https://railway.app/signup
2. Sign up with GitHub
3. Create new project
```

### 2.2 Add PostgreSQL Database
```
1. Click "+ New"
2. Select "Provision PostgreSQL"
3. Wait for database to be created
4. Click on the database
5. Go to "Variables" tab
6. Copy the "DATABASE_URL"
```

### 2.3 Update Vercel Environment
```
1. Go back to Vercel
2. Go to your project → Settings → Environment Variables
3. Update DATABASE_URL with Railway URL
4. Redeploy (automatic)
```

---

## Step 3: Set Up Demo Database (Separate Instance)

### 3.1 Create Demo PostgreSQL
**Option A: Railway (Recommended)**
```
1. In Railway, click "+ New" again
2. Select "Provision PostgreSQL"
3. Name it "demo-database"
4. Copy the DATABASE_URL
```

**Option B: Neon (Free Tier)**
```
1. Go to: https://neon.tech
2. Sign up for free
3. Create new project
4. Copy connection string
```

### 3.2 Seed Demo Database
```bash
# Connect to demo database
DATABASE_URL="your-demo-database-url" npx prisma db push

# Seed with demo data (script to be created)
DATABASE_URL="your-demo-database-url" npm run db:seed:demo
```

### 3.3 Update Vercel for Demo
Add these to Vercel environment variables:
```env
DEMO_DATABASE_URL="your-demo-database-url"
DEMO_MODE=true  # Only for demo deployment
```

---

## Step 4: Create Demo Users

Run this in your demo database:

```sql
-- Insert demo users
INSERT INTO users (email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES 
  ('demo@test.com', '$2a$10$hashedpassword', 'Demo Admin', 'CEO', true, NOW(), NOW()),
  ('manager@test.com', '$2a$10$hashedpassword', 'Demo Manager', 'MANAGER', true, NOW(), NOW()),
  ('worker@test.com', '$2a$10$hashedpassword', 'Demo Worker', 'WORKER', true, NOW(), NOW());

-- Password for all: demo123
```

Or use Prisma Studio:
```bash
npx prisma studio
```

---

## Step 5: Test Everything

### 5.1 Test Production
```
1. Visit: https://your-app.vercel.app
2. Login with your production credentials
3. Verify data is loading
```

### 5.2 Test Demo
```
1. Visit: https://your-app.vercel.app/demo
2. Click "Launch Demo Application"
3. Login with: demo@test.com / demo123
4. Verify demo data is showing (not your real data)
```

---

## Step 6: Update Your Resume

Add to your resume:

```
Live Demo: https://your-app.vercel.app/demo
GitHub: https://github.com/coldhearted0913/LRBillingOnline
Tech: Next.js 14, TypeScript, PostgreSQL, AWS S3
```

---

## Step 7: Share with Recruiters

Your demo is now live! Share these links:

- **Demo Landing**: https://your-app.vercel.app/demo
- **Direct Login**: https://your-app.vercel.app/login
- **GitHub**: https://github.com/coldhearted0913/LRBillingOnline

---

## ✅ Checklist

- [ ] Deployed to Vercel
- [ ] Created production database on Railway
- [ ] Created separate demo database
- [ ] Added environment variables
- [ ] Seeded demo database with sample data
- [ ] Created demo users
- [ ] Tested production (real data)
- [ ] Tested demo (fake data)
- [ ] Updated resume with live URL
- [ ] Updated README with demo link

---

## 🆘 Need Help?

Check these files:
- `DEMO_MODE_SETUP.md` - Detailed security architecture
- `README.md` - Project documentation
- `SECURITY.md` - Security practices
