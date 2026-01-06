require('dotenv').config();
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    console.log("Testing GetObject permission...");
    console.log("Access Key:", process.env.AWS_ACCESS_KEY_ID);
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: "products/1767472406532-IMG-20241211-WA0076.jpg",
    });
    
    const response = await s3Client.send(command);
    console.log("\n✅ SUCCESS: GetObject permission is working!");
    console.log("Status:", response.$metadata.httpStatusCode);
    console.log("\nYour images should now display correctly.");
    
  } catch (err) {
    console.error("\n❌ FAILED: GetObject permission NOT granted");
    console.error("Error:", err.message);
    console.error("\nYou must add s3:GetObject permission to your IAM user before images will display.");
  }
})();
