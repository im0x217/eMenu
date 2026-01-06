# Fix Image Upload - Add Real AWS Credentials

## Problem
❌ Images won't upload because AWS credentials are placeholders

## Solution

### Step 1: Add Real AWS Credentials to .env

1. Open: `c:\Users\mohan\OneDrive\سطح المكتب\eMenu\eMenu\.env`

2. Replace:
```
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

With your actual credentials:
```
AWS_ACCESS_KEY_ID=AKIAS7OINZXM5QPMGPK2
AWS_SECRET_ACCESS_KEY=dTN2ursIXsTwCbP1ICmZXY9DpfkYWllpB6NG2mRY
```

3. Save the file

### Step 2: Restart Server

```bash
# Kill old server
taskkill /F /IM node.exe

# Wait 2 seconds
timeout /t 2

# Start new server
node server.js
```

### Step 3: Verify It Works

```bash
node test-s3-upload.js
```

Should show: ✅ Bucket "e-menu-products" found!

### Step 4: Test Image Upload

1. Go to: http://localhost:3000/admin.html
2. Add/Edit a product
3. Upload an image
4. Save
5. Image should appear immediately in the product list

## ⚠️ Security Note

These credentials are now in your .env file (local only, not in git).
But they were exposed in earlier git commits.

**Recommended action:**
- Rotate these AWS credentials in your AWS account
- Create new credentials for this project
- This prevents anyone with the old keys from using your S3 bucket

Would you like help rotating the credentials?
