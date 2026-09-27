require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db2 = client.db('emenu2');
  const prods = await db2.collection('products').find({}).toArray();
  const withLink = prods.filter(p => p.inventoryLink && p.inventoryLink.recordId).length;
  const withFlag = prods.filter(p => p.hasStorage === true).length;
  console.log(`Total: ${prods.length}, With link: ${withLink}, With hasStorage: true: ${withFlag}`);

  // Set hasStorage: true on all products that have an inventoryLink
  const updateRes = await db2.collection('products').updateMany(
    { 'inventoryLink.recordId': { $exists: true, $ne: null } },
    { $set: { hasStorage: true } }
  );
  console.log(`Updated ${updateRes.modifiedCount} products to have hasStorage: true`);

  await client.close();
}

main().catch(console.error);
