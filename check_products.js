require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('emenu');
  const products = db.collection('products');
  
  const count = await products.countDocuments();
  const sampleProducts = await products.find({}).limit(3).toArray();
  
  console.log(`\n📊 Total products: ${count}\n`);
  console.log('Sample products:');
  sampleProducts.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.name}`);
    console.log(`   img: ${p.img}`);
    console.log(`   cloudinary_public_id: ${p.cloudinary_public_id || '(missing)'}`);
  });
  
  // Count products with and without public_id
  const withPublicId = await products.countDocuments({ cloudinary_public_id: { $exists: true } });
  const withoutPublicId = await products.countDocuments({ cloudinary_public_id: { $exists: false } });
  
  console.log(`\n✅ Products WITH cloudinary_public_id: ${withPublicId}`);
  console.log(`❌ Products WITHOUT cloudinary_public_id: ${withoutPublicId}`);
  
  await client.close();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
