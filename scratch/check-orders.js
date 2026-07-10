const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

MongoClient.connect(MONGO_URI).then(async (client) => {
  const db = client.db("emenu");
  const db2 = client.db("emenu2");

  console.log("--- Checking emenu.orders ---");
  const orders1 = await db.collection("orders").find().toArray();
  orders1.forEach((o, i) => {
    console.log(`Order ${i+1} (${o._id}):`, {
      customerInfo: o.customerInfo,
      hasName: o.customerInfo && o.customerInfo.name,
      hasPhone: o.customerInfo && o.customerInfo.phone
    });
  });

  console.log("\n--- Checking emenu2.orders ---");
  const orders2 = await db2.collection("orders").find().toArray();
  orders2.forEach((o, i) => {
    console.log(`Order ${i+1} (${o._id}):`, {
      customerInfo: o.customerInfo,
      hasName: o.customerInfo && o.customerInfo.name,
      hasPhone: o.customerInfo && o.customerInfo.phone
    });
  });

  await client.close();
}).catch(console.error);
