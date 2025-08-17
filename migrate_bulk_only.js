require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

async function migrateZeroPriceToBulk() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db('emenu');
    const productsCollection = db.collection('products');
    console.log('Connected to MongoDB.');

    console.log('Updating products with 0 regular price to be "bulk" only...');
    
    // Find products where regular price is 0 (number), "0" (string), or an empty string
    const result = await productsCollection.updateMany(
      { price_regular: { $in: [0, "0", "", null] } },
      { $set: { purchaseType: 'bulk' } }
    );

    console.log(`Migration complete. ${result.matchedCount} products were matched and ${result.modifiedCount} products were updated.`);

  } catch (error) {
    console.error('An error occurred during the migration process:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

migrateZeroPriceToBulk();
