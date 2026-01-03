require('dotenv').config();
const { S3Client, PutBucketPolicyCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET || "e-menu-products";

// Bucket policy that allows public read access to all objects
const bucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "PublicReadGetObject",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: `arn:aws:s3:::${bucket}/*`
    }
  ]
};

(async () => {
  try {
    console.log(`Setting bucket policy for ${bucket}...`);
    console.log(`Policy:`, JSON.stringify(bucketPolicy, null, 2));
    
    const command = new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(bucketPolicy)
    });
    
    await s3Client.send(command);
    console.log("\n✅ SUCCESS: Bucket policy applied!");
    console.log("All objects in the bucket are now publicly readable via direct URL.");
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.code === 'AccessDenied') {
      console.log("\nYour IAM user doesn't have s3:PutBucketPolicy permission.");
      console.log("You need to add this permission to your IAM user.");
    }
  }
})();
