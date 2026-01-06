# Fix Render Deployment - Add AWS Credentials

## Problem
❌ AWS credentials missing on Render.com
❌ App can't access S3 bucket
❌ Products endpoint returns credential error

## Solution: Add Environment Variables to Render

### Step 1: Go to Render Dashboard
1. Visit: https://dashboard.render.com
2. Click your service: "e-menu-tcaw" (or similar)
3. Click "Environment" in the left sidebar

### Step 2: Add AWS Credentials
Click "Add Environment Variable" and add:

```
AWS_REGION=us-east-1

AWS_ACCESS_KEY_ID=AKIAS7OINZXM5QPMGPK2

AWS_SECRET_ACCESS_KEY=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

AWS_S3_BUCKET=e-menu-products

MONGO_URI=mongodb+srv://muhanad:Mohanedatr42@cluster0.zttnpkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

ADMIN_USER=admin

ADMIN_PASS=1977
```

### Step 3: Save & Redeploy
1. Click "Save" 
2. Render automatically redeploys
3. Wait 1-2 minutes for deployment
4. Check: https://e-menu-tcaw.onrender.com/api/products

### Step 4: Verify
Once redeployed:
- ✅ /api/products should return 243 products (with placeholder images)
- ✅ /menu.html should load (showing products with logo placeholder)
- ✅ /admin.html should let you upload new images

## Alternative: Use Render Secrets
If you want to hide credentials (more secure):
1. Go to Dashboard → Settings
2. Click "Secrets"
3. Add credentials there
4. Reference in code: process.env.AWS_ACCESS_KEY_ID

## Note
⚠️ These are the SAME credentials from your local .env
You'll need to rotate them later since they were exposed in git history
