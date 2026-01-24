require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

async function addPurchaseTypeToProducts() {
  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db('emenu');
    const productsCollection = db.collection('products');
    console.log('Connected to MongoDB.');

    console.log('Updating products to include purchaseType field...');
    
    const result = await productsCollection.updateMany(
      { purchaseType: { $exists: false } }, // Filter for documents that do NOT have the purchaseType field
      { $set: { purchaseType: 'both' } }      // Set the purchaseType field to 'both'
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

addPurchaseTypeToProducts();
