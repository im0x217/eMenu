require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const corsRules = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "HEAD"],
      AllowedOrigins: ["*"],
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
      MaxAgeSeconds: 3600
    }
  ]
};

async function applyCORS() {
  try {
    console.log("Applying CORS configuration to bucket:", process.env.AWS_S3_BUCKET);
    
    await s3.send(new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      CORSConfiguration: corsRules
    }));
    
    console.log("✓ CORS configuration applied successfully!");
    console.log("Browser requests from any origin can now access bucket objects.");
  } catch (error) {
    console.error("✗ Error applying CORS:", error.message);
    if (error.Code === 'AccessDenied') {
      console.error("  → IAM user needs s3:PutBucketCORS permission");
    }
    process.exit(1);
  }
}

applyCORS();
