# AWS IAM Fix Required

## Problem
Your AWS access key `AKIAS7OINZXM5QPMGPK2` can **upload** files (PutObject) but **cannot read/download** them (GetObject). This causes 403 errors on image URLs.

## Solution
Add `s3:GetObject` permission to your IAM user. Follow these steps:

### Option 1: Using AWS Console (Easiest)
1. Go to https://console.aws.amazon.com/iam/
2. Click **Users** → Find **Muhanad** user
3. Click on the user name
4. Go to **Permissions** tab
5. Look for the existing S3 policy (should be something like `S3FullAccess` or custom policy)
6. **Edit the policy** and add these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::e-menu-products",
        "arn:aws:s3:::e-menu-products/*"
      ]
    }
  ]
}
```

7. Click **Review policy** → **Save changes**
8. Wait ~1-2 minutes for AWS to update

### Option 2: Contact AWS Account Owner
If you don't have permission to edit IAM policies:
- Ask the account owner to add `s3:GetObject` action to your user's S3 permissions
- Specifically for the `e-menu-products` bucket and all objects (`/*`)

## After Fixing
Once permissions are updated:
1. Your images will be readable from S3
2. No code changes needed - everything is already set up
3. Old images will start displaying

## Test the Fix
After updating permissions, run:
```bash
node test-signed-url.js
```

This should show `✅ SUCCESS` instead of `❌ FORBIDDEN`.
