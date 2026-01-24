require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('emenu');
  const categories = db.collection('categories');

  const result = await categories.updateOne(
    { name: 'عبمبر و روزاطه' },
    {
      $setOnInsert: { emoji: '💖' },
      $addToSet: { subCategories: 'روزاطه' }
    },
    { upsert: true }
  );

  const cat = await categories.findOne({ name: 'عبمبر و روزاطه' });
  console.log('Matched:', result.matchedCount, 'Modified:', result.modifiedCount, 'UpsertedId:', result.upsertedId?.toString());
  console.log('Category document:', cat);

  await client.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
