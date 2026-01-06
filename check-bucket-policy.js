require('dotenv').config();
const { S3Client, GetBucketPolicyCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    console.log("Checking S3 bucket policy...\n");
    const command = new GetBucketPolicyCommand({ Bucket: process.env.AWS_S3_BUCKET });
    const response = await s3Client.send(command);
    const policy = JSON.parse(response.Policy);
    console.log("Bucket Policy:");
    console.log(JSON.stringify(policy, null, 2));
    
  } catch (err) {
    if (err.code === 'NoSuchBucketPolicy') {
      console.log("✅ No bucket policy (that's fine)");
    } else {
      console.error("Error:", err.message);
    }
  }
})();
