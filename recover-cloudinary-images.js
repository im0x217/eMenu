#!/usr/bin/env node
/**
 * Recover old Cloudinary images from git history
 * This restores the img URLs that were previously in the database
 */

require('dotenv').config();
const { MongoClient } = require("mongodb");
const { execSync } = require('child_process');

const MONGO_URI = process.env.MONGO_URI;

async function recoverCloudinaryImages() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    
    // Get the old database state from git
    console.log('📚 Fetching old product data from git...');
    let oldData;
    try {
      const gitOutput = execSync('git show HEAD~5:check_products.js', { encoding: 'utf-8' });
      console.log('Found git history');
    } catch (err) {
      console.log('⚠️  Could not access git history');
    }

    // Alternative: show what Cloudinary URLs we had
    console.log('\n🔍 Checking Cloudinary for recoverable images...');
    
    const db = client.db("emenu");
    const productsCollection = db.collection("products");
    
    // Check if we can find any backup or historical references
    const allProducts = await productsCollection.find({}).toArray();
    console.log(`Found ${allProducts.length} products in database`);
    
    // Count products by status
    const noImg = allProducts.filter(p => !p.img).length;
    const hasImg = allProducts.filter(p => p.img).length;
    const hasCloudinary = allProducts.filter(p => p.img && p.img.includes('cloudinary.com')).length;
    
    console.log(`
📊 Product Status:
  • Products WITHOUT images: ${noImg}
  • Products WITH S3 images: ${hasImg}
  • Products WITH Cloudinary references: ${hasCloudinary}
    `);

    // Show available options
    console.log(`
🔧 Recovery Options:

1. Restore from git history (if available):
   git log --oneline | head -10
   git show <COMMIT>:server.js

2. Download from Cloudinary dashboard:
   - Visit https://cloudinary.com/console/
   - Check Media Library folder "e-menu-products"
   - Export/download all images
   - Re-upload via admin panel to S3

3. Check if Cloudinary blocks access due to settings:
   - Log in to Cloudinary
   - Go to Settings → Security
   - Check if "Require signed URLs" is enabled
   - Temporarily disable to test access
   - Re-enable after downloading

4. Test direct Cloudinary access:
   curl -I https://res.cloudinary.com/dcydipptm/image/upload/v1754850811/e-menu-products/product-6887ec8dce4637eeaa702325-1754850810136.jpg
    `);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

recoverCloudinaryImages();
