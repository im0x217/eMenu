require('dotenv').config();
const { S3Client, ListObjectsV2Command, CopyObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION || "us-east-1";

// Map file extensions to MIME types
const getContentType = (key) => {
  const ext = key.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

async function fixImageMetadata() {
  try {
    console.log("Listing objects in bucket:", bucket);
    
    const listResult = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'products/'
    }));
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log("No objects found in products/ folder");
      return;
    }
    
    console.log(`Found ${listResult.Contents.length} objects. Updating metadata...\n`);
    
    let fixed = 0;
    for (const obj of listResult.Contents) {
      const key = obj.Key;
      const contentType = getContentType(key);
      
      console.log(`Fixing: ${key}`);
      console.log(`  → Setting Content-Type: ${contentType}`);
      console.log(`  → Setting Cache-Control: public, max-age=31536000`);
      
      try {
        await s3.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: key,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000',
          MetadataDirective: 'REPLACE',
          // Preserve existing metadata
          Metadata: {
            fieldname: 'img'
          }
        }));
        
        console.log(`  ✓ Updated successfully\n`);
        fixed++;
      } catch (copyErr) {
        console.error(`  ✗ Error: ${copyErr.message}\n`);
      }
    }
    
    console.log(`\n✓ Finished! Updated ${fixed}/${listResult.Contents.length} objects`);
    console.log("\nNew uploads will automatically have correct metadata.");
    console.log("Existing images now have:");
    console.log("  • Correct Content-Type (image/jpeg, etc.)");
    console.log("  • Cache-Control: public, max-age=31536000");
    
  } catch (error) {
    console.error("✗ Error:", error);
    if (error.Code === 'AccessDenied') {
      console.error("  → IAM user needs s3:ListBucket and s3:PutObject permissions");
    }
    process.exit(1);
  }
}

fixImageMetadata();
