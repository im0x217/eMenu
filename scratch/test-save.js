const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
console.log("Connecting to:", MONGO_URI);

MongoClient.connect(MONGO_URI).then(async (client) => {
  console.log("✓ Connected to MongoDB");
  const db = client.db("emenu");
  const db2 = client.db("emenu2");

  const customersCollection = db.collection("customers");
  const ordersCollection = db.collection("orders");
  const ordersCollection2 = db2.collection("orders");

  try {
    // 1. Test Customer Upsert
    console.log("Testing customer upsert...");
    const custRes = await customersCollection.updateOne(
      { phone: "0910000000" },
      { 
        $set: { 
          name: "Test User", 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log("✓ Customer upserted:", custRes);

    // 2. Test Shop 1 Order Insert
    console.log("Testing Shop 1 order insert...");
    const orderDoc = {
      customerInfo: {
        name: "Test User",
        phone: "0910000000"
      },
      items: [
        {
          productId: new ObjectId(),
          name: "Test Sweet Product",
          price: 15,
          quantity: 2,
          allowFloat: false,
          notes: "Extra sweet"
        }
      ],
      totalPrice: 30,
      deliveryDate: "2026-07-08",
      notes: "Please pack carefully",
      priceMode: "regular",
      status: "pending",
      whatsappSent: true,
      createdAt: new Date()
    };
    const orderRes = await ordersCollection.insertOne(orderDoc);
    console.log("✓ Shop 1 order inserted:", orderRes);

    // 3. Test Shop 2 Order Insert
    console.log("Testing Shop 2 order insert...");
    const orderDoc2 = {
      customerInfo: {
        name: "Test User",
        phone: "0910000000"
      },
      items: [
        {
          productId: new ObjectId(),
          name: "Test Nawashif Product",
          price: 10,
          quantity: 3,
          allowFloat: false,
          notes: ""
        }
      ],
      totalPrice: 30,
      deliveryDate: "2026-07-08",
      notes: "",
      priceMode: "regular",
      status: "pending",
      whatsappSent: true,
      createdAt: new Date()
    };
    const orderRes2 = await ordersCollection2.insertOne(orderDoc2);
    console.log("✓ Shop 2 order inserted:", orderRes2);

    console.log("All tests completed successfully!");
  } catch (err) {
    console.error("✗ Database Operation Failed:", err);
  } finally {
    await client.close();
  }
}).catch((err) => {
  console.error("✗ Connection Failed:", err.message);
});
