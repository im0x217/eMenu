require('dotenv').config();
const { S3Client, CopyObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET || "e-menu-products";

(async () => {
  try {
    console.log("Listing all images in S3...\n");
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "products/"
    });
    
    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];
    
    console.log(`Found ${objects.length} images\n`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const obj of objects) {
      try {
        console.log(`Fixing: ${obj.Key}...`);
        
        // Copy object to itself with public-read ACL using NEW credentials
        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${obj.Key}`,
          Key: obj.Key,
          ACL: "public-read",
          MetadataDirective: "COPY"
        });
        
        await s3Client.send(copyCommand);
        console.log(`  ✅ Fixed!\n`);
        fixed++;
        
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}\n`);
        errors++;
      }
    }
    
    console.log(`\nResults:`);
    console.log(`  ✅ Fixed: ${fixed}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`\nAll images should now be publicly accessible!`);
    
  } catch (err) {
    console.error("Fatal error:", err.message);
  }
})();
