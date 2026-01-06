require('dotenv').config();
const { S3Client, CopyObjectCommand } = require("@aws-sdk/client-s3");
const { MongoClient, ObjectId } = require("mongodb");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const mongoUri = process.env.MONGO_URI;
const bucket = process.env.AWS_S3_BUCKET || "e-menu-products";

(async () => {
  const client = new MongoClient(mongoUri);
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    
    const db1 = client.db("emenu");
    const db2 = client.db("emenu2");
    
    // Get all products with S3 images
    const products1 = await db1.collection("products").find({ img: { $regex: "amazonaws.com" } }).toArray();
    const products2 = await db2.collection("products").find({ img: { $regex: "amazonaws.com" } }).toArray();
    
    const allProducts = [...products1, ...products2];
    console.log(`Found ${allProducts.length} products with S3 images\n`);
    
    let updated = 0;
    let errors = 0;
    
    for (const product of allProducts) {
      try {
        if (!product.img) continue;
        
        // Extract the key from the S3 URL
        // Format: https://e-menu-products.s3.us-east-1.amazonaws.com/products/filename
        const urlParts = product.img.split('/');
        const s3Key = urlParts.slice(-2).join('/'); // Get 'products/filename'
        
        console.log(`Re-uploading ${product.name}...`);
        
        // Copy object with public-read ACL
        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${s3Key}`,
          Key: s3Key,
          ACL: "public-read", // Make it public
          MetadataDirective: "COPY", // Copy existing metadata
        });
        
        await s3Client.send(copyCommand);
        updated++;
        console.log(`  ✅ Updated to public-read\n`);
        
      } catch (err) {
        errors++;
        console.log(`  ❌ Error: ${err.message}\n`);
      }
    }
    
    console.log(`\nResults:`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`\nAll S3 images now have public-read ACL!`);
    
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    await client.close();
  }
})();
