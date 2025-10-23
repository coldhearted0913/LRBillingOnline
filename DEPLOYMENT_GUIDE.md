# 🚀 LR Billing Web App - Deployment Guide

## ✅ Prerequisites

Before deploying, ensure you have:
- AWS Account (for S3 file storage)
- AWS Access Keys configured in `.env.local`
- All features working locally

---

## 🎯 Recommended: Deploy to Vercel (Best for Next.js)

Vercel is the easiest and most reliable option for Next.js apps with full feature support.

### Step 1: Prepare Your Project

1. **Create a `.gitignore` file** (if not exists):
```bash
# In lr_billing_web folder
node_modules/
.next/
.env*.local
*.log
.vercel
prisma/dev.db-journal
```

2. **Create `.env.local` template** - Copy to `.env.production`:
```bash
cp .env.local .env.production
```

### Step 2: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 3: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (first time - will ask questions)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? lr-billing-app (or your choice)
# - Directory? ./ (current directory)
# - Override settings? No

# Deploy to production
vercel --prod
```

### Step 4: Configure Environment Variables on Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   - `AWS_ACCESS_KEY_ID` = (your AWS access key)
   - `AWS_SECRET_ACCESS_KEY` = (your AWS secret key)
   - `AWS_REGION` = (your AWS region, e.g., ap-south-1)
   - `S3_BUCKET_NAME` = (your S3 bucket name)

5. Click **Save**
6. Go to **Deployments** tab
7. Click **...** on latest deployment → **Redeploy**

### Step 5: Database Setup

**Important:** Vercel uses serverless functions, so the SQLite file-based database will reset on each deployment.

**Solution - Use Vercel Postgres (Recommended):**

```bash
# Install Vercel Postgres
npm install @vercel/postgres

# Update prisma/schema.prisma
# Change provider from "sqlite" to "postgresql"
```

**OR - Keep SQLite with Persistent Storage:**

Use Vercel's Volume Storage (Beta) or deploy to Railway instead.

---

## 🔄 Alternative: Deploy to Railway.app (Easiest with SQLite)

Railway supports persistent file storage, perfect for SQLite databases.

### Step 1: Prepare Railway Deployment

Your `railway.json` is already configured!

### Step 2: Deploy to Railway

1. **Go to** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click** "New Project"
4. **Select** "Deploy from GitHub repo"
5. **Connect** your GitHub account
6. **Push your code** to GitHub first:

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit - LR Billing Web App"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/lr-billing-app.git
git branch -M main
git push -u origin main
```

7. **Select** your repository in Railway
8. **Railway will auto-deploy** using `railway.json` config

### Step 3: Add Environment Variables in Railway

1. In Railway dashboard, go to your project
2. Click **Variables** tab
3. Add these variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`

4. Railway will automatically redeploy

### Step 4: Access Your App

- Railway will provide a URL: `https://your-app-name.up.railway.app`
- Your database persists across deployments ✅
- All features work as expected ✅

---

## 🌐 Alternative: Deploy to Render.com

Render also supports persistent disks for SQLite.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lr-billing-app.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to https://render.com
2. Sign up/Login
3. Click **New +** → **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name:** lr-billing-app
   - **Environment:** Node
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Add Disk** (for SQLite persistence):
     - Mount Path: `/app/prisma`
     - Size: 1GB

6. Add Environment Variables:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET_NAME`

7. Click **Create Web Service**

---

## 📊 Comparison Table

| Feature | Vercel | Railway | Render |
|---------|--------|---------|--------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **SQLite Support** | ❌ (Need Postgres) | ✅ | ✅ |
| **Free Tier** | ✅ Generous | ✅ $5/month | ✅ Free tier |
| **Auto Deploy** | ✅ | ✅ | ✅ |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **Best For** | Serverless | Full-stack apps | Full-stack apps |

---

## 🎯 My Recommendation: Railway.app

**Why Railway:**
1. ✅ **SQLite works perfectly** - Persistent storage
2. ✅ **Easy setup** - Connect GitHub and deploy
3. ✅ **Database persists** - Your data is safe across deployments
4. ✅ **All features work** - No code changes needed
5. ✅ **Good free tier** - $5/month for hobby projects

---

## 🚨 Important: Before Deploying

### 1. Ensure `.env.local` has AWS credentials:
```
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-bucket-name
```

### 2. Test locally one more time:
```bash
cd lr_billing_web
npm run build
npm start
```

### 3. Verify all features work:
- ✅ Create LR
- ✅ Edit LR
- ✅ Generate Bills
- ✅ Rework Bill
- ✅ Additional Bill
- ✅ Download files
- ✅ S3 upload
- ✅ Admin Dashboard

---

## 🎉 Quick Deploy (Railway - Fastest)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize and deploy
cd lr_billing_web
railway init
railway up

# 4. Add environment variables
railway variables set AWS_ACCESS_KEY_ID=your_key
railway variables set AWS_SECRET_ACCESS_KEY=your_secret
railway variables set AWS_REGION=ap-south-1
railway variables set S3_BUCKET_NAME=your-bucket

# 5. Open your deployed app
railway open
```

**That's it! Your app will be live in minutes!** 🎊

---

## 📱 Access Your App

After deployment, you'll get a URL like:
- **Vercel:** `https://lr-billing-app.vercel.app`
- **Railway:** `https://lr-billing-app.up.railway.app`
- **Render:** `https://lr-billing-app.onrender.com`

You can access it from:
- ✅ Your computer
- ✅ Your phone
- ✅ Any device with internet
- ✅ Anywhere in the world

---

## 🔒 Security Note

Your AWS credentials are stored securely as environment variables and are NOT exposed in the code or to users.

---

## 💾 Database Backup

Your SQLite database is:
1. **Stored on the server** (persistent across restarts)
2. **Backed up** in the Admin Dashboard (Export JSON feature)
3. **Synced to S3** for generated Excel files

---

## 🆘 Need Help?

If you encounter any issues during deployment, the console logs (both browser and server) will show detailed debugging information to help identify the problem.

**Ready to deploy? Follow the Railway quick deploy steps above!** 🚀

