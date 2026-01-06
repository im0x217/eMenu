# eMenu - AWS S3 Image Storage Setup

This project now uses **AWS S3** instead of Cloudinary for image hosting.

## Setup Instructions

### 1. Create AWS S3 Bucket
1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to S3 service
3. Click "Create Bucket"
4. Name it `e-menu-products` (or customize in `.env`)
5. Block public access: **OFF** (we need public read access)
6. Enable ACLs: **ON**
7. Create the bucket

### 2. Create IAM User
1. Go to IAM → Users
2. Create a new user: `e-menu-app`
3. Attach policy: **AmazonS3FullAccess**
4. Create access key (choose "Application running outside AWS")
5. Copy the Access Key ID and Secret Access Key

### 3. Update `.env` File
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=e-menu-products
```

### 4. Verify Bucket Policy
Make sure your bucket allows public read access. Go to S3 bucket → Permissions → Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::e-menu-products/*"
    }
  ]
}
```

### 5. Run the App
```bash
npm install
node server.js
```

## Benefits
✅ Free tier: 5GB storage, 20,000 GET requests/month
✅ No 401 authentication errors
✅ Faster, more reliable than Cloudinary
✅ Full control over your data
✅ Easy to migrate away from if needed

## Image Upload
Images are automatically uploaded to S3 when products are created via the admin panel.
