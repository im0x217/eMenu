#!/usr/bin/env node

/**
 * Test S3 PutObject permission (what we need for uploads)
 */

require('dotenv').config();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testUpload() {
  try {
    console.log('\n📦 Testing S3 PutObject (upload) permission...\n');
    
    const testKey = 'test-' + Date.now() + '.txt';
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testKey,
      Body: 'Test upload at ' + new Date().toISOString(),
      ContentType: 'text/plain',
    });
    
    await s3Client.send(command);
    console.log('✅ S3 upload permission works!\n');
    console.log('✅ Image uploads should work now\n');
    console.log('📝 Next steps:');
    console.log('1. Start server: node server.js');
    console.log('2. Go to http://localhost:3000/admin.html');
    console.log('3. Upload an image to a product');
    console.log('4. Image should save to S3 and display\n');
    
  } catch (err) {
    console.log('❌ Upload Failed:');
    console.log(`   ${err.message}\n`);
  }
}

testUpload();
