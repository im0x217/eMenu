#!/usr/bin/env node
/**
 * Migrate old Cloudinary products
 * Options:
 * 1. Delete products with broken Cloudinary images
 * 2. Mark them as requiring new images
 */

require('dotenv').config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;

async function migrateOldProducts() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db("emenu");
    const productsCollection = db.collection("products");
    
    // Find all products with Cloudinary URLs
    const cloudinaryProducts = await productsCollection
      .find({ img: { $regex: "cloudinary.com" } })
      .toArray();
    
    console.log(`\n📦 Found ${cloudinaryProducts.length} products with Cloudinary images`);
    console.log(`These images are broken (401 errors) and need to be replaced.\n`);
    
    if (cloudinaryProducts.length === 0) {
      console.log("✅ No old Cloudinary products found!");
      await client.close();
      return;
    }
    
    console.log("Options:");
    console.log("1. Delete these products");
    console.log("2. Keep them but mark as no-image (set img to null)");
    console.log("\nRun with argument: node migrate-old-products.js [1|2]\n");
    
    const action = process.argv[2];
    
    if (action === '1') {
      console.log(`🗑️  Deleting ${cloudinaryProducts.length} products with broken images...`);
      const result = await productsCollection.deleteMany({ 
        img: { $regex: "cloudinary.com" } 
      });
      console.log(`✅ Deleted ${result.deletedCount} products`);
      
    } else if (action === '2') {
      console.log(`🔄 Setting broken images to null...`);
      const result = await productsCollection.updateMany(
        { img: { $regex: "cloudinary.com" } },
        { $set: { img: null } }
      );
      console.log(`✅ Updated ${result.modifiedCount} products`);
      console.log(`\nℹ️  Re-upload images via admin panel to use S3\n`);
      
    } else {
      console.log("❌ Please specify action: node migrate-old-products.js [1|2]");
      process.exit(1);
    }
    
    // Show sample of affected products
    console.log("\n📋 Sample of affected products:");
    cloudinaryProducts.slice(0, 3).forEach((product) => {
      console.log(`  - ${product.name}`);
    });
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrateOldProducts();
