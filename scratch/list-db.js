const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

MongoClient.connect(MONGO_URI).then(async (client) => {
  console.log("✓ Connected to MongoDB");
  
  const adminDb = client.db().admin();
  const dbsInfo = await adminDb.listDatabases();
  console.log("\n--- Databases found ---");
  console.log(dbsInfo.databases);

  for (const dbInfo of dbsInfo.databases) {
    const dbName = dbInfo.name;
    if (dbName === 'emenu' || dbName === 'emenu2') {
      console.log(`\n--- Collections in Database: ${dbName} ---`);
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - Collection: ${col.name} (${count} documents)`);
      }
    }
  }

  await client.close();
}).catch((err) => {
  console.error("✗ Connection Failed:", err.message);
});
