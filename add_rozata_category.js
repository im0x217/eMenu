require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('emenu');
  const products = db.collection('products');

  // Find and update products
  const result = await products.updateMany(
    { name: { $regex: 'روزاطة' } },
    { $set: { 
          category: 'عبمبر و روزاطه',
          subCategory: 'روزاطة'
      } 
    }
  );

  console.log('Update completed!');
  console.log('Matched: ' + result.matchedCount);
  console.log('Modified: ' + result.modifiedCount);

  // Verify the update
  const updatedProducts = await products.find({ name: { $regex: 'روزاطة' } }).toArray();
  console.log('\nUpdated products:');
  updatedProducts.forEach(p => {
    console.log('- ' + p.name);
    console.log('  Category: ' + p.category + ', SubCategory: ' + p.subCategory);
  });

  await client.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
