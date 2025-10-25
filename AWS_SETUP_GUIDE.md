# AWS S3 Setup Guide for Railway

This guide will help you set up AWS S3 for cloud file storage on Railway.

## Prerequisites
- An AWS account (free tier available)
- 5 minutes

---

## Step 1: Create an AWS Account

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Sign up for a free account (12 months free tier)
3. Verify your email and phone number

---

## Step 2: Create an S3 Bucket

1. Log in to AWS Console
2. Search for "S3" and click it
3. Click **"Create bucket"**

### Bucket Settings:
- **Bucket name**: `lr-billing-invoices-mangesh` (must be globally unique)
- **Region**: `ap-south-1` (Mumbai, closest to India)
- **Block Public Access**: ✅ Keep checked (default)
- Click **"Create bucket"**

---

## Step 3: Create IAM User with S3 Access

1. Search for "IAM" in AWS Console
2. Click **"Users"** in left sidebar
3. Click **"Create user"**

### User Configuration:
- **User name**: `lr-billing-railway`
- **Access type**: Check **"Programmatic access"**
- Click **"Next"**

### Permissions:
- Click **"Attach existing policies directly"**
- Search for `AmazonS3FullAccess`
- Check the box
- Click **"Next"** → **"Create user"**

### Save Credentials:
- **Access Key ID**: Copy this! (e.g., `AKIAIOSFODNN7EXAMPLE`)
- **Secret Access Key**: Copy this! (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
- ⚠️ **Click "Download .csv"** to save credentials

---

## Step 4: Add to Railway

1. Go to your Railway project: https://railway.com/project/7533faa4-72cf-42a0-9bab-c6231d28934c
2. Click your **web service**
3. Click **"Variables"** tab
4. Click **"+ New Variable"** button

Add these 4 variables:

| Variable Name | Value (from Step 3) |
|---------------|---------------------|
| `S3_ACCESS_KEY_ID` | Your Access Key ID |
| `S3_SECRET_ACCESS_KEY` | Your Secret Access Key |
| `S3_REGION` | `ap-south-1` |
| `S3_BUCKET_NAME` | `lr-billing-invoices-mangesh` |

5. Click **"Deploy"** to redeploy

---

## Step 5: Verify Setup

After deployment, check your health endpoint:

```
https://your-app.up.railway.app/api/health
```

You should see:
```json
{
  "S3_ACCESS_KEY_ID": "✅ Set",
  "S3_SECRET_ACCESS_KEY": "✅ Set",
  "S3_REGION": "✅ Set",
  "S3_BUCKET_NAME": "✅ Set"
}
```

---

## Test S3 Upload

1. Go to your Railway app
2. Generate a bill (Additional/Rework)
3. Check the logs - you should see:
   ```
   S3 upload successful
   ```

4. Check your S3 bucket:
   - Go to AWS Console → S3
   - Click your bucket
   - You should see uploaded files!

---

## Troubleshooting

### "Access Denied" Error
- Check IAM user has `AmazonS3FullAccess` policy
- Verify bucket name is correct

### "Bucket Not Found"
- Check bucket name is exactly correct (case-sensitive)
- Check region matches bucket region

### Files Not Uploading
- Check Railway logs for errors
- Verify all 4 environment variables are set
- Check health endpoint

---

## Security Best Practices

1. **Never commit AWS credentials to Git**
2. **Use IAM users, not root account**
3. **Limit permissions** (only S3 access needed)
4. **Rotate keys** every 90 days

---

## Cost Estimate (AWS Free Tier)

- **Free tier**: 5 GB storage, 20,000 GET requests, 2,000 PUT requests per month
- **After free tier**: ~$0.023 per GB/month
- **For 1000 files/month**: ~$1-2/month total

---

## Alternative: Skip S3 (Files Stored Locally)

If you don't need cloud storage:
- Leave S3 variables **unset** in Railway
- Files will be stored in Railway's local filesystem
- ⚠️ Files will be **lost on redeploy**

---

## Support

If you need help:
1. Check Railway logs
2. Check AWS CloudWatch logs
3. Test S3 access with AWS CLI
