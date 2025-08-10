require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MONGO_URI = process.env.MONGO_URI;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function migrateToCloudinary() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db('emenu');
    const productsCollection = db.collection('products');
    console.log('Connected to MongoDB.');

    console.log('Finding products with local images to migrate...');
    // Find products that have a local image path (starting with '/uploads/') and no cloudinary_public_id
    const productsToMigrate = await productsCollection.find({ 
        img: { $regex: /^\/uploads\// },
        cloudinary_public_id: { $exists: false } 
    }).toArray();

    if (productsToMigrate.length === 0) {
      console.log('No products with local images found to migrate.');
      return;
    }

    console.log(`Found ${productsToMigrate.length} products to migrate.`);

    for (const product of productsToMigrate) {
      // Remove leading slash from product.img to correctly join paths
      const imageRelativePath = product.img.startsWith('/') ? product.img.substring(1) : product.img;
      const localImagePath = path.join(__dirname, imageRelativePath);

      if (fs.existsSync(localImagePath)) {
        try {
          console.log(`Uploading ${product.name}'s image (${product.img}) to Cloudinary...`);
          
          const result = await cloudinary.uploader.upload(localImagePath, {
            folder: 'e-menu-products',
            public_id: `product-${product._id}-${Date.now()}`
          });

          console.log(`Successfully uploaded. Public ID: ${result.public_id}`);

          // Update the product in the database with the new Cloudinary URL and public_id
          await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: {
                img: result.secure_url,
                cloudinary_public_id: result.public_id,
              },
            }
          );
          console.log(`Updated product ${product.name} in the database.`);

        } catch (uploadError) {
          console.error(`Failed to upload image for product ${product.name} (${product._id}):`, uploadError);
        }
      } else {
        console.warn(`Image file not found for product ${product.name} at path: ${localImagePath}. Skipping.`);
      }
    }

    console.log('Migration to Cloudinary completed successfully!');
  } catch (error) {
    console.error('An error occurred during the migration process:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

migrateToCloudinary();
