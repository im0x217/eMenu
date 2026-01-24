require('dotenv').config();
const { MongoClient } = require('mongodb');

// Normalize all "عبمبر" products to category/subCategory shown in the UI.
(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('emenu');
  const products = db.collection('products');

  const filter = {
    $or: [
      { name: { $regex: 'عبمبر' } },
      { category: 'عبمبر' }
    ]
  };

  const update = {
    $set: {
      category: 'عبمبر و روزاطه',
      subCategory: 'عبمبر'
    }
  };

  const result = await products.updateMany(filter, update);
  console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount);

  const updated = await products.find(filter).project({ name: 1, category: 1, subCategory: 1 }).toArray();
  console.log('\nUpdated products:');
  updated.forEach(p => console.log(`- ${p.name} => ${p.category} / ${p.subCategory}`));

  await client.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
