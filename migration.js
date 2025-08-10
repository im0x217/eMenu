require('dotenv').config();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

// Make sure to set your MONGO_URI in your environment variables
// or replace process.env.MONGO_URI with your connection string.
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("MONGO_URI environment variable is not set.");
    process.exit(1);
}

const client = new MongoClient(MONGO_URI);

async function migrateProducts() {
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db("emenu");
    const productsCollection = db.collection("products");
    const products = await productsCollection.find({}).toArray();

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    console.log(`Found ${products.length} products to check for migration.`);
    let migratedCount = 0;

    for (const product of products) {
      // Check if img is a base64 data URL
      if (product.img && product.img.startsWith('data:image/')) {
        try {
            const matches = product.img.match(/^data:(image\/(.+));base64,(.*)$/);
            if (!matches || matches.length !== 4) {
                console.log(`Skipping product with malformed data URI: ${product.name}`);
                continue;
            }
            
            const imageType = matches[2];
            const base64Data = matches[3];
            const buffer = Buffer.from(base64Data, 'base64');
            
            const filename = `${product._id}.${imageType}`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, buffer);
            
            const newImgPath = `/uploads/${filename}`;
            
            await productsCollection.updateOne(
              { _id: product._id },
              { $set: { img: newImgPath } }
            );
            
            console.log(`Migrated product image for: ${product.name}`);
            migratedCount++;
        } catch (e) {
            console.error(`Could not migrate product: ${product.name}`, e);
        }
      } else {
        console.log(`Skipping already migrated product: ${product.name}`);
      }
    }
    console.log(`\nMigration completed. Migrated ${migratedCount} product images.`);
  } catch (err) {
    console.error("\nMigration failed:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

migrateProducts();
