#!/usr/bin/env node
/**
 * Script to create AWS S3 bucket for eMenu
 * Run: node create-s3-bucket.js
 */

require('dotenv').config();
const { S3Client, CreateBucketCommand, PutBucketAclCommand, PutBucketPolicyCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "e-menu-products";

async function createBucket() {
  try {
    console.log(`🔨 Creating S3 bucket: ${BUCKET_NAME}...`);
    
    // Create bucket
    try {
      await s3Client.send(new CreateBucketCommand({
        Bucket: BUCKET_NAME,
      }));
      console.log(`✅ Bucket created successfully!`);
    } catch (err) {
      if (err.Code === 'BucketAlreadyOwnedByYou') {
        console.log(`✅ Bucket already exists!`);
      } else if (err.Code === 'BucketAlreadyExists') {
        console.error(`❌ Error: Bucket name is already taken. Change AWS_S3_BUCKET in .env`);
        process.exit(1);
      } else {
        throw err;
      }
    }

    // Set bucket policy for public read (doesn't require ACL changes)
    console.log(`📋 Setting bucket policy for public read access...`);
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy),
    }));
    console.log(`✅ Bucket policy set successfully!`);

    console.log(`\n✨ S3 bucket is ready for eMenu!`);
    console.log(`📦 Bucket name: ${BUCKET_NAME}`);
    console.log(`🌐 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`\n🎉 You can now upload images to S3!`);
    
  } catch (err) {
    console.error(`❌ Error:`, err.message);
    process.exit(1);
  }
}

createBucket();
