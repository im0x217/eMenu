// This script changes the S3 bucket ACL to allow public-read access
// This is needed because the signed URLs aren't working with private ACL

require('dotenv').config();
const { S3Client, PutBucketAclCommand, GetBucketAclCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  try {
    console.log("Checking current bucket ACL...");
    const getAcl = new GetBucketAclCommand({ Bucket: process.env.AWS_S3_BUCKET });
    const aclResponse = await s3Client.send(getAcl);
    console.log("Current Owner:", aclResponse.Owner.DisplayName);
    console.log("Current Grants:", aclResponse.Grants.map(g => `${g.Grantee.Type}: ${g.Permission}`));
    
    console.log("\nChanging bucket ACL to public-read...");
    const command = new PutBucketAclCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      ACL: "public-read"  // Allow public read access
    });
    
    await s3Client.send(command);
    console.log("✅ Bucket ACL changed to public-read");
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.code === 'AccessDenied') {
      console.log("\nYour IAM user doesn't have permission to change bucket ACL.");
      console.log("This requires s3:PutBucketAcl permission.");
    }
  }
})();
