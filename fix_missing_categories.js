require('dotenv').config();
const { MongoClient } = require('mongodb');

// Ensures every product has a category and subCategory.
// Defaults: category -> "غير مصنف", subCategory -> "بدون فرعي".
(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('emenu');
  const db2 = client.db('emenu2');

  const defaults = {
    category: 'غير مصنف',
    subCategory: 'بدون فرعي',
  };

  const fixCollection = async (col) => {
    // Add missing category and subCategory together when category is absent/empty
    const missingCat = await col.updateMany(
      {
        $or: [
          { category: { $exists: false } },
          { category: null },
          { category: '' },
        ],
      },
      {
        $set: {
          category: defaults.category,
          subCategory: defaults.subCategory,
        },
      }
    );

    // Add missing subCategory when category exists but subCategory is absent/empty
    const missingSub = await col.updateMany(
      {
        category: { $exists: true, $ne: '' },
        $or: [
          { subCategory: { $exists: false } },
          { subCategory: null },
          { subCategory: '' },
        ],
      },
      {
        $set: { subCategory: defaults.subCategory },
      }
    );

    return { missingCat, missingSub };
  };

  const products1 = db.collection('products');
  const products2 = db2.collection('products');

  const [res1, res2] = await Promise.all([
    fixCollection(products1),
    fixCollection(products2),
  ]);

  const countStats = async (col) => ({
    total: await col.countDocuments({}),
    missingCategory: await col.countDocuments({ $or: [ { category: { $exists: false } }, { category: null }, { category: '' } ] }),
    missingSubCategory: await col.countDocuments({ $or: [ { subCategory: { $exists: false } }, { subCategory: null }, { subCategory: '' } ] }),
  });

  const [stats1, stats2] = await Promise.all([
    countStats(products1),
    countStats(products2),
  ]);

  console.log('=== shop1 (emenu) ===');
  console.log('Matched catless:', res1.missingCat.matchedCount, 'Modified:', res1.missingCat.modifiedCount);
  console.log('Matched subless:', res1.missingSub.matchedCount, 'Modified:', res1.missingSub.modifiedCount);
  console.log('After fix:', stats1);

  console.log('\n=== shop2 (emenu2) ===');
  console.log('Matched catless:', res2.missingCat.matchedCount, 'Modified:', res2.missingCat.modifiedCount);
  console.log('Matched subless:', res2.missingSub.matchedCount, 'Modified:', res2.missingSub.modifiedCount);
  console.log('After fix:', stats2);

  await client.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
