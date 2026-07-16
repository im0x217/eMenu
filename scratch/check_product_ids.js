const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://muhanad:Mohanedatr42@cluster0.zttnpkq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db("emenu");
    const productsCollection = db.collection("products");
    
    const idsToCheck = [
      "689a804a1ada86f974e7f621",
      "689b4ed8d8b2c1dae990a7a0",
      "689bb8ebd8b2c1dae990a7a8",
      "69fb75d82d1779fc2cebb013",
      "69fb76142d1779fc2cebb014",
      "69fb765b2d1779fc2cebb015",
      "69fb76932d1779fc2cebb016"
    ];
    
    console.log("Checking products collection for favorites IDs...");
    for (const id of idsToCheck) {
      const prod = await productsCollection.findOne({ _id: new ObjectId(id) });
      if (prod) {
        console.log(`- FOUND: ID: ${id}, Name: "${prod.name}", Category: "${prod.category}"`);
      } else {
        console.log(`- NOT FOUND: ID: ${id}`);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

main();
