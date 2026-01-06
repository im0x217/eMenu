#!/usr/bin/env node

/**
 * Diagnose image upload issues
 */

require('dotenv').config();

console.log('\n🔍 Checking AWS Configuration...\n');

// Check if credentials are loaded
const credentials = {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'MISSING',
  bucket: process.env.AWS_S3_BUCKET
};

console.log('Environment Variables:');
Object.entries(credentials).forEach(([key, value]) => {
  const status = value === 'MISSING' ? '❌' : (value === '***' ? '✅' : '✅');
  console.log(`  ${status} ${key}: ${value}`);
});

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.log('\n⚠️  ERROR: AWS credentials are missing from .env file!');
  console.log('\nTo fix:');
  console.log('1. Open .env file');
  console.log('2. Add these lines:');
  console.log('   AWS_REGION=us-east-1');
  console.log('   AWS_ACCESS_KEY_ID=your_key_here');
  console.log('   AWS_SECRET_ACCESS_KEY=your_secret_here');
  console.log('   AWS_S3_BUCKET=e-menu-products');
  console.log('\n3. Restart the server: node server.js');
  process.exit(1);
}

console.log('\n✅ Credentials loaded!\n');

// Try connecting to S3
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testS3() {
  try {
    console.log('📦 Testing S3 connection...');
    const result = await s3Client.send(new ListBucketsCommand({}));
    const hasBucket = result.Buckets.some(b => b.Name === process.env.AWS_S3_BUCKET);
    
    if (hasBucket) {
      console.log(`✅ Bucket "${process.env.AWS_S3_BUCKET}" found!\n`);
      console.log('✅ S3 configuration is working correctly\n');
      console.log('📝 Next steps:');
      console.log('1. Start server: node server.js');
      console.log('2. Go to http://localhost:3000/admin.html');
      console.log('3. Try uploading an image to a product');
      console.log('4. Image should appear immediately in the product list\n');
    } else {
      console.log(`❌ Bucket "${process.env.AWS_S3_BUCKET}" not found!\n`);
      console.log('Available buckets:');
      result.Buckets.forEach(b => console.log(`  - ${b.Name}`));
      console.log('\nTo create the bucket, run: node create-s3-bucket.js\n');
    }
  } catch (err) {
    console.log('❌ S3 Connection Error:');
    console.log(`   ${err.message}\n`);
    console.log('Possible issues:');
    console.log('  - Invalid AWS credentials');
    console.log('  - Network connection problem');
    console.log('  - AWS credentials have wrong permissions\n');
  }
}

testS3();
