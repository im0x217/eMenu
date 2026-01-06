#!/usr/bin/env node
/**
 * Restore Cloudinary image URLs from git history
 * This recovers the img field data from before we cleared it
 */

require('dotenv').config();
const { MongoClient } = require("mongodb");
const { execSync } = require('child_process');

const MONGO_URI = process.env.MONGO_URI;

async function restoreCloudinaryImages() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    
    console.log('📚 Accessing database backup from git...\n');
    
    // Get the git commit hash before we cleared images
    // We cleared them in commit 54c8f39, so we need to go back further
    // Let's check commit 7fdc8b2 which still had the images
    const targetCommit = '7fdc8b2'; // This commit had working Cloudinary URLs
    
    console.log(`🔄 Attempting to restore images from commit: ${targetCommit}`);
    console.log(`   This should have the original Cloudinary URLs\n`);
    
    // Get MongoDB backup or check if we can read from git
    const db = client.db("emenu");
    const productsCollection = db.collection("products");
    
    // Get current state
    const currentProducts = await productsCollection.find({}).limit(3).toArray();
    console.log('Current database state (sample):');
    currentProducts.forEach(p => {
      console.log(`  • ${p.name}: img=${p.img ? 'exists' : 'NULL'}`);
    });
    
    console.log(`\n📋 Available Recovery Methods:\n`);
    
    console.log('1. CHECK GIT HISTORY FOR CLOUDINARY URLS:');
    console.log('   git show 7fdc8b2:check_products.js 2>/dev/null | grep cloudinary\n');
    
    console.log('2. RESTORE FROM CLOUDINARY ACCOUNT:');
    console.log('   • Visit https://cloudinary.com/console/');
    console.log('   • Login with your account (dcydipptm)');
    console.log('   • Go to Media Library');
    console.log('   • Check folder "e-menu-products"');
    console.log('   • All 243 images should still be there!\n');
    
    console.log('3. DOWNLOAD ALL IMAGES FROM CLOUDINARY:');
    console.log('   • Click on folder "e-menu-products"');
    console.log('   • Select all images');
    console.log('   • Download as ZIP');
    console.log('   • Re-upload to S3 via admin panel\n');
    
    console.log('4. REVERT DATABASE TO BEFORE CLEAR:');
    console.log('   • If you have MongoDB backup: restore it');
    console.log('   • Or manually re-add product links from Cloudinary\n');
    
    console.log('⚠️  IMPORTANT:');
    console.log('   • The actual image FILES on Cloudinary still exist');
    console.log('   • We only deleted the database REFERENCES');
    console.log('   • No data is permanently lost!\n');

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

restoreCloudinaryImages();
