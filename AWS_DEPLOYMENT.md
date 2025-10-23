# 🚀 AWS Deployment Guide - LR Billing Web App

## 🎯 Recommended: AWS Amplify (Easiest)

AWS Amplify is perfect for Next.js applications and provides:
- ✅ Automatic builds and deployments
- ✅ Free SSL certificate (HTTPS)
- ✅ Global CDN for fast access
- ✅ Easy environment variable management
- ✅ GitHub integration for auto-deploy on push

---

## 🚨 IMPORTANT: Database Consideration

**AWS Amplify Issue:** Amplify uses serverless hosting, which means:
- ❌ SQLite file will be **reset on every deployment**
- ❌ Your data will be **lost** unless you migrate to a cloud database

**Solutions:**

### Option A: Migrate to PostgreSQL (Recommended for AWS)
Use AWS RDS or Neon.tech for PostgreSQL database.

### Option B: Use a Different AWS Service
- **AWS App Runner** - Supports persistent storage
- **AWS Lightsail** - Virtual server with full control
- **EC2 Instance** - Most control but more complex

### Option C: Use Railway/Render Instead
These platforms natively support SQLite with persistent storage.

---

## 📋 Deployment Steps (AWS Amplify)

### Prerequisites:
1. AWS Account
2. GitHub Account
3. Code pushed to GitHub

---

## ⚡ Quick Deploy (Use This!)

### Step 1: Run the Deployment Script

```bash
# Navigate to the web app folder
cd lr_billing_web

# Run the simple deployment script
DEPLOY_AWS_SIMPLE.bat
```

This script will:
1. ✅ Initialize Git if needed
2. ✅ Push your code to GitHub
3. ✅ Open AWS Amplify Console
4. ✅ Show you step-by-step instructions

---

### Step 2: Follow the Console Instructions

The script will open AWS Amplify Console. Then:

1. **Click "New app" → "Host web app"**

2. **Connect GitHub:**
   - Choose "GitHub"
   - Authorize AWS Amplify to access your GitHub
   - Select your repository

3. **Configure Build Settings:**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - npx prisma generate
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

4. **Add Environment Variables** (CRITICAL):
   - Click "Environment variables"
   - Add each variable:
     - `AWS_ACCESS_KEY_ID` = your-access-key
     - `AWS_SECRET_ACCESS_KEY` = your-secret-key
     - `AWS_REGION` = ap-south-1 (or your region)
     - `S3_BUCKET_NAME` = your-bucket-name

5. **Save and Deploy**
   - Wait 5-10 minutes for first deployment
   - Your app will be live!

---

## 🔄 Auto-Deploy Setup

Once connected to GitHub:
- ✅ Push code to GitHub → Automatically deploys
- ✅ No manual deployment needed
- ✅ See build logs in Amplify console

---

## ⚠️ Database Migration (If Using Amplify)

Since Amplify doesn't support persistent SQLite, you need to migrate to PostgreSQL:

### Quick Migration Steps:

1. **Create PostgreSQL Database:**
   - Go to https://neon.tech (Free tier)
   - Create a new database
   - Copy the connection string

2. **Update Prisma Schema:**

In `prisma/schema.prisma`, change:
```prisma
// From:
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// To:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Add to Environment Variables:**
   - In AWS Amplify console
   - Add variable: `DATABASE_URL` = your-neon-connection-string

4. **Deploy:**
   - Amplify will auto-redeploy
   - Database will persist! ✅

---

## 💰 AWS Cost Estimate

**AWS Amplify Free Tier (First Year):**
- Build minutes: 1,000 minutes/month
- Hosting: 15 GB served/month
- Storage: 5 GB

**After Free Tier (~$5-15/month):**
- $0.01 per build minute
- $0.15 per GB served
- $0.023 per GB stored

**For your app:** Likely $5-10/month with moderate usage

---

## 🌐 Alternative: AWS App Runner (Better for SQLite)

If you want to keep SQLite without migration:

### Using AWS App Runner:

1. **Create ECR Repository:**
```bash
aws ecr create-repository --repository-name lr-billing-app
```

2. **Build and Push Docker Image:**
```bash
docker build -t lr-billing-app .
docker tag lr-billing-app:latest YOUR_AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/lr-billing-app:latest
docker push YOUR_AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/lr-billing-app:latest
```

3. **Create App Runner Service** via AWS Console

**Note:** This is more complex but supports persistent storage.

---

## 🎯 My Recommendation

### For Easiest Deployment:
**Use Railway.app or Render.com** instead of AWS
- ✅ SQLite works out of the box
- ✅ 5-minute setup
- ✅ No database migration needed
- ✅ All features work immediately

### For AWS Deployment:
**Use AWS Amplify + Neon PostgreSQL**
- ✅ Fully AWS ecosystem
- ✅ Reliable and scalable
- ✅ Requires database migration (30 minutes)

---

## 📞 Need Help?

**Quick Start AWS:**
1. Run `DEPLOY_AWS_SIMPLE.bat`
2. Follow the on-screen instructions
3. Add environment variables in Amplify Console
4. Your app goes live!

**Issues?**
- Check build logs in AWS Amplify Console
- Verify environment variables are set
- Ensure GitHub repository is accessible

---

## 🔗 Useful Links

- AWS Amplify Console: https://console.aws.amazon.com/amplify/
- AWS CLI Download: https://aws.amazon.com/cli/
- Neon.tech (Free PostgreSQL): https://neon.tech
- AWS App Runner: https://console.aws.amazon.com/apprunner/

---

**Ready to deploy? Run `DEPLOY_AWS_SIMPLE.bat` to get started!** 🚀

