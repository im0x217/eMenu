require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://crystal-crocodile.pikapod.net';

// Arabic normalizer matching server.js
const normalizeArabicText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel
    .replace(/\u0640/g, '')               // Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ي/g, 'ى')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9a-zA-Z]/g, '')
    .toLowerCase();
};

async function pbFetch(path, options = {}) {
  const url = `${POCKETBASE_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PocketBase ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function main() {
  console.log('=== Syncing All Shop 2 Products to PocketBase ===');
  console.log(`PocketBase URL: ${POCKETBASE_URL}`);

  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db2 = client.db('emenu2');
  const productsCollection = db2.collection('products');

  // 1. Fetch all PocketBase records
  console.log('Fetching existing PocketBase inventory records...');
  const pbRes = await pbFetch('/collections/inventory/records?perPage=500');
  const pbItems = Array.isArray(pbRes.items) ? pbRes.items : [];
  console.log(`Found ${pbItems.length} existing items in PocketBase.`);

  // Find max legacy_id
  let maxLegacyId = 0;
  for (const item of pbItems) {
    const num = parseInt(item.legacy_id, 10);
    if (!isNaN(num) && num > maxLegacyId) maxLegacyId = num;
  }
  console.log(`Current highest legacy_id: ${maxLegacyId}`);

  // Maps for fast lookup
  const pbById = new Map();
  const pbByExactName = new Map();
  const pbByNormName = new Map();

  for (const item of pbItems) {
    pbById.set(item.id, item);
    pbByExactName.set(item.name.trim(), item);
    const norm = normalizeArabicText(item.name);
    if (norm && !pbByNormName.has(norm)) {
      pbByNormName.set(norm, item);
    }
  }

  // 2. Fetch all Shop 2 products
  const products = await productsCollection.find({}).toArray();
  console.log(`Found ${products.length} products in Shop 2 (emenu2).`);

  let alreadyLinkedCount = 0;
  let newlyMatchedCount = 0;
  let newlyCreatedCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const prodName = (product.name || '').trim();
    if (!prodName) {
      console.warn(`[SKIP] Product ${product._id} has no name.`);
      continue;
    }

    // Check if already linked to a valid PB record
    if (product.inventoryLink && product.inventoryLink.recordId) {
      const existingPb = pbById.get(product.inventoryLink.recordId);
      if (existingPb) {
        alreadyLinkedCount++;
        continue;
      }
    }

    // Check if item exists in PB by exact name or normalized name
    let matchedPb = pbByExactName.get(prodName) || pbByNormName.get(normalizeArabicText(prodName));

    if (matchedPb) {
      // Link to existing PB record
      const linkDoc = {
        recordId: matchedPb.id,
        legacyId: matchedPb.legacy_id || '',
        itemName: matchedPb.name,
        conversionFactor: 1
      };
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { inventoryLink: linkDoc } }
      );
      newlyMatchedCount++;
      console.log(`[LINK EXISTING] Linked "${prodName}" -> PB "${matchedPb.name}" (${matchedPb.id}, stock: ${matchedPb.quantity})`);
      continue;
    }

    // Need to create new item in PocketBase with quantity: 0
    maxLegacyId++;
    const nextLegacyIdStr = maxLegacyId.toString();
    const pbPayload = {
      name: prodName,
      category: (product.category || 'عام').trim(),
      quantity: 0, // NEW items value set to 0 per user requirement
      min_stock: 0,
      legacy_id: nextLegacyIdStr,
      last_updated_legacy: new Date().toISOString()
    };

    try {
      const createdItem = await pbFetch('/collections/inventory/records', {
        method: 'POST',
        body: JSON.stringify(pbPayload)
      });

      // Update in-memory caches to prevent duplicates
      pbById.set(createdItem.id, createdItem);
      pbByExactName.set(createdItem.name.trim(), createdItem);
      const norm = normalizeArabicText(createdItem.name);
      if (norm) pbByNormName.set(norm, createdItem);

      // Link product in MongoDB
      const linkDoc = {
        recordId: createdItem.id,
        legacyId: createdItem.legacy_id || nextLegacyIdStr,
        itemName: createdItem.name,
        conversionFactor: 1
      };
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { inventoryLink: linkDoc } }
      );

      newlyCreatedCount++;
      console.log(`[CREATED & LINKED] "${prodName}" -> PB (${createdItem.id}, legacy_id: ${nextLegacyIdStr}, stock: 0)`);
    } catch (err) {
      errorCount++;
      console.error(`[ERROR] Failed to create PB item for "${prodName}":`, err.message);
    }
  }

  console.log('\n=== Sync Summary ===');
  console.log(`Total Shop 2 Products: ${products.length}`);
  console.log(`Already Linked Before: ${alreadyLinkedCount}`);
  console.log(`Matched to Existing PB Items: ${newlyMatchedCount}`);
  console.log(`Newly Created in PocketBase (Stock = 0): ${newlyCreatedCount}`);
  console.log(`Errors: ${errorCount}`);

  // Verification step
  console.log('\n=== Verification ===');
  const finalPbRes = await pbFetch('/collections/inventory/records?perPage=500');
  const finalPbItems = Array.isArray(finalPbRes.items) ? finalPbRes.items : [];
  console.log(`Total items in PocketBase now: ${finalPbItems.length}`);

  const totalShop2 = await productsCollection.countDocuments();
  const linkedShop2 = await productsCollection.countDocuments({
    'inventoryLink.recordId': { $exists: true, $ne: null }
  });
  console.log(`Total Shop 2 products: ${totalShop2}`);
  console.log(`Total Shop 2 products with inventoryLink: ${linkedShop2}`);

  await client.close();
  console.log('\nSync finished successfully!');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
