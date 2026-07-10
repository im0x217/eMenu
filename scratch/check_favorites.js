const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://muhanad:Mohanedatr42@cluster0.zttnpkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    // Check emenu db
    const db = client.db("emenu");
    const collections = await db.listCollections().toArray();
    console.log("Collections in emenu:", collections.map(c => c.name));
    
    const customers = await db.collection("customers").find().toArray();
    console.log(`\n=== CUSTOMERS (${customers.length}) ===`);
    customers.forEach(c => {
      console.log(`- Name: "${c.name}", Phone: "${c.phone}", Created: ${c.createdAt}`);
    });

    const favorites = await db.collection("favorites").find().toArray();
    console.log(`\n=== FAVORITES (${favorites.length}) ===`);
    favorites.forEach(f => {
      console.log(`- Phone: "${f.phone}", ProductId: "${f.productId}", Shop: "${f.shop}"`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
