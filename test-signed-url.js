require('dotenv').config();
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const https = require('https');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    console.log("Testing signed URL generation...");
    console.log("Access Key:", process.env.AWS_ACCESS_KEY_ID);
    console.log("Region:", process.env.AWS_REGION);
    console.log("Bucket:", process.env.AWS_S3_BUCKET);
    
    // Test with a real S3 key from the error
    const s3Key = "products/1767472406532-IMG-20241211-WA0076.jpg";
    console.log("\nGenerating signed URL for:", s3Key);
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("\n✅ Signed URL Generated:");
    console.log(url.substring(0, 100) + "...\n");
    
    // Try to fetch it
    console.log("Testing if URL is accessible...");
    https.get(url, (res) => {
      console.log(`Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log("✅ SUCCESS: Signed URL is accessible!");
      } else if (res.statusCode === 403) {
        console.log("❌ FORBIDDEN: Access denied. Check IAM permissions.");
      } else if (res.statusCode === 404) {
        console.log("❌ NOT FOUND: File doesn't exist in S3.");
      } else {
        console.log(`❌ ERROR: Unexpected status ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error("Network error:", err.message);
    });
    
  } catch (err) {
    console.error("Error:", err.message);
    if (err.message.includes('Invalid credential')) {
      console.log("❌ Invalid AWS credentials!");
    }
  }
})();
