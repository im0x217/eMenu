require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://crystal-crocodile.pikapod.net';

const links = [
  { pbId: 'zrosvdkbig5gwte', prodId: '69657f9ca61e183d9c0334f1', note: 'غريبة عادية' },
  { pbId: 'tmixwcsepkk1tmw', prodId: '69658023a61e183d9c0334f2', note: 'غريبة لوز' },
  { pbId: 'li21bg05ty4s58h', prodId: '696581b7a61e183d9c0334f6', note: 'غريبة نسكافى -> غريبة النسكافيه و الوز' },
  { pbId: 'cmp2xctduhr3j2t', prodId: '69662372a61e183d9c033504', note: 'كعك الزهر -> كعك الزهر بالجيلجلان' },
  { pbId: 'qxbzsolil45rkze', prodId: '69662201a61e183d9c0334ff', note: 'كعك مالح جيلجلان -> كعك مالح بالجيلجان' },
  { pbId: '3mjx8z9fp85im4b', prodId: '696623bfa61e183d9c033506', note: 'كعك شوش الورد' },
  { pbId: 'jn8kfrdj9j7v9ca', prodId: '6966234ba61e183d9c033503', note: 'كعك كنافة' },
  { pbId: 's812ypviz5f3cb9', prodId: '69662328a61e183d9c033502', note: 'كعك شكلاطة لوز' },
  { pbId: '4axb8hpzz2d9mci', prodId: '696ba1fb889c665238852fb0', note: 'كعك مضفور -> اميحة كعك مظفور' },
  { pbId: 'hs2f00yi41eonsg', prodId: '697629be6944a70a1b1b4f07', note: 'اصابع كرونفلكس' },
  { pbId: 'p95bm17hq7ij35y', prodId: '696624dda61e183d9c033508', note: 'مبرومة عصافير' },
  { pbId: 'tokxcm6jvmm3aeg', prodId: '6966261ba61e183d9c03350e', note: 'كوكيز لوز 🍪 -> كوكيز لوز' },
  { pbId: 'crn7ltqt0ds4rb6', prodId: '696627bea61e183d9c03350f', note: 'كوكيز شكلاطة -> كوكيز شكلاطة' },
  { pbId: 'hr0s8uq18kmpjnn', prodId: '6a4bbc83e580c792a46124aa', note: 'كوكبرنج سنكرس' },
  { pbId: 'kfcdkimkj06oyfz', prodId: '6aa88042799ecee218aa6d6f', note: 'اصابع الجيلجلان بالتمر -> اصابع الجيلجلان و التمر' },
  { pbId: 'e9k73x2q7jsxser', prodId: '6aa9551d0969a538cdf18bb5', note: 'كعك فيرارو سوداء' },
  { pbId: 'tzpp2m7002z2kwi', prodId: '6aa9557d0969a538cdf18bb6', note: 'قرينات الفيرارو سوداء' },
  { pbId: 'gthi7x1ab5rrhhx', prodId: '696bf005889c665238852fb3', note: 'لويزة لوتس -> لويزة شكلاطة لوتس' },
  { pbId: '31irl4udnx999s9', prodId: '696befd7889c665238852fb2', note: 'لويزة لوز -> لويزة شكلاطة لوز' },
  { pbId: 'jld6xl1skn2iadz', prodId: '69d18c01adb0a3cfd2eb24d0', note: 'كورات جوز هند -> كورات جوز الهند' },
  { pbId: '0ej0933gxk64yge', prodId: '69ceb452adb0a3cfd2eb24ce', note: 'كورات كرونفلكس -> كورات الكرونفلكس بالوز' }
];

async function main() {
  console.log('Connecting to PocketBase and MongoDB...');
  const pbRes = await fetch(`${POCKETBASE_URL}/api/collections/inventory/records?perPage=500`);
  const pbData = await pbRes.json();
  const pbItems = pbData.items || [];

  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db2 = client.db('emenu2');
  const productsCollection = db2.collection('products');
  const reservationsCollection = db2.collection('stock_reservations');
  const ordersCollection = db2.collection('orders');

  console.log(`\n=== 1. Batch Linking ${links.length} Products ===`);
  let linkedCount = 0;
  for (const l of links) {
    const pb = pbItems.find(i => i.id === l.pbId);
    if (!pb) {
      console.warn(`[WARN] PB item ${l.pbId} not found`);
      continue;
    }

    const linkDoc = {
      recordId: pb.id,
      legacyId: pb.legacy_id || '',
      itemName: pb.name,
      conversionFactor: 1
    };

    const updateRes = await productsCollection.updateOne(
      { _id: new ObjectId(l.prodId) },
      { $set: { inventoryLink: linkDoc } }
    );

    if (updateRes.matchedCount > 0) {
      linkedCount++;
      console.log(`✓ Linked "${pb.name}" (${pb.id}) -> Product ${l.prodId} [modified: ${updateRes.modifiedCount}]`);
    } else {
      console.warn(`[WARN] Product ${l.prodId} not found in emenu2`);
    }
  }
  console.log(`Successfully linked ${linkedCount}/${links.length} products.\n`);

  console.log('=== 2. Resolving Stock Reservation for Order #2214 ===');
  const order2214 = await ordersCollection.findOne({ orderNumber: 2214 });
  if (!order2214) {
    console.error('Order #2214 not found in database!');
  } else {
    console.log(`Found Order #2214 (ID: ${order2214._id}), Status: ${order2214.status}`);
    const existingRes = await reservationsCollection.findOne({ orderNumber: 2214 });
    if (existingRes) {
      console.log('Reservation already exists for Order #2214:', existingRes._id);
    } else {
      // 1. Deduct stock in PocketBase for 'غريبة عادية' (zrosvdkbig5gwte)
      const targetPbId = 'zrosvdkbig5gwte';
      const orderQty = 2;

      // Get current stock
      const getPbRes = await fetch(`${POCKETBASE_URL}/api/collections/inventory/records/${targetPbId}`);
      const pbItem = await getPbRes.json();
      const prevStock = typeof pbItem.quantity === 'number' ? pbItem.quantity : 0;
      const newStock = Math.max(0, prevStock - orderQty);

      console.log(`PocketBase "${pbItem.name}" stock: ${prevStock} -> ${newStock} (deducting ${orderQty})`);

      const patchRes = await fetch(`${POCKETBASE_URL}/api/collections/inventory/records/${targetPbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: newStock,
          last_updated_legacy: new Date().toISOString()
        })
      });
      const patchData = await patchRes.json();
      console.log('PocketBase PATCH response quantity:', patchData.quantity);

      // 2. Insert into stock_reservations
      const reservationDoc = {
        orderNumber: order2214.orderNumber,
        orderId: order2214._id,
        status: 'reserved',
        items: [
          {
            productId: '69657f9ca61e183d9c0334f1',
            productName: 'غريبة عادية',
            inventoryRecordId: targetPbId,
            inventoryItemName: pbItem.name,
            orderedQty: orderQty,
            conversionFactor: 1,
            reservedQty: orderQty,
            previousStock: prevStock,
            newStock: newStock
          }
        ],
        reservedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const insertRes = await reservationsCollection.insertOne(reservationDoc);
      console.log(`✓ Inserted reservation ${insertRes.insertedId} for Order #2214 with status 'reserved'`);
    }
  }

  console.log('\n=== 3. Verification ===');
  const verifyRes = await reservationsCollection.findOne({ orderNumber: 2214 });
  console.log('Reservation in DB:', verifyRes ? `Found (status: ${verifyRes.status})` : 'NOT FOUND');

  const checkPB = await fetch(`${POCKETBASE_URL}/api/collections/inventory/records/zrosvdkbig5gwte`);
  const finalPB = await checkPB.json();
  console.log(`PocketBase "${finalPB.name}" final stock: ${finalPB.quantity}`);

  const totalShop2 = await productsCollection.countDocuments();
  const linkedShop2 = await productsCollection.countDocuments({ 'inventoryLink.recordId': { $exists: true, $ne: null } });
  console.log(`Total Shop 2 Products: ${totalShop2} | Total Linked to PocketBase: ${linkedShop2}`);

  await client.close();
  console.log('\nAll operations completed successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
