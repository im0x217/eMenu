const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://muhanad:Mohanedatr42@cluster0.zttnpkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db("emenu");
    
    const shop = "shop1";
    const ordColl = db.collection("orders");
    const customersCollection = db.collection("customers");
    const favoritesCollection = db.collection("favorites");
    
    const customers = await customersCollection.find().toArray();
    
    console.log(`Querying details for shop: ${shop}`);
    
    const customersWithDetails = await Promise.all(customers.map(async (cust) => {
      const phone = cust.phone;
      
      const orderStats = await ordColl.aggregate([
        { $match: { "customerInfo.phone": phone, status: "completed" } },
        { $group: {
            _id: null,
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } }
      ]).toArray();

      const favRecords = await favoritesCollection.find({ phone, shop }).toArray();
      const favorites = favRecords.map(f => f.productId.toString());

      return {
        name: cust.name,
        phone: cust.phone,
        favorites
      };
    }));
    
    console.log("\n=== CUSTOMERS RETRIEVED BY BACKEND ===");
    console.log(JSON.stringify(customersWithDetails, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
