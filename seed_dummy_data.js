require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("✗ MONGO_URI is missing from .env");
  process.exit(1);
}

const mockCustomers = [
  { name: "أحمد بن رمضان", phone: "0911002233" },
  { name: "محمد الترهوني", phone: "0911004455" },
  { name: "فاطمة الورفلي", phone: "0922003344" },
  { name: "علي الشيباني", phone: "0911008899" },
  { name: "سارة المصراتي", phone: "0922007788" },
  { name: "خالد الزنتاني", phone: "0911006677" },
  { name: "مريم الفيتوري", phone: "0922001122" },
  { name: "عبد الله الغرياني", phone: "0911009900" },
  { name: "ياسمين بن عيسى", phone: "0922005566" },
  { name: "عمر الساحلي", phone: "0911005544" }
];

const statuses = ['completed', 'completed', 'completed', 'pending', 'canceled'];
const priceModes = ['regular', 'regular', 'regular', 'bulk'];

async function run() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    console.log("✓ Connected to MongoDB");
    
    // Explicitly target the databases
    const db1 = client.db("emenu");
    const db2 = client.db("emenu2");
    
    const productsColl1 = db1.collection("products");
    const productsColl2 = db2.collection("products"); // In emenu2 db, collection is "products"
    
    const ordersColl1 = db1.collection("orders");
    const ordersColl2 = db2.collection("orders"); // In emenu2 db, collection is "orders"
    
    const customersColl = db1.collection("customers"); // Customers only exist in emenu db
    const favoritesColl = db1.collection("favorites"); // Favorites only exist in emenu db
    
    let shop1Products = await productsColl1.find({}).toArray();
    let shop2Products = await productsColl2.find({}).toArray();
    
    console.log(`✓ Fetched ${shop1Products.length} Shop1 products from 'emenu' db`);
    console.log(`✓ Fetched ${shop2Products.length} Shop2 products from 'emenu2' db`);
    
    // If Shop 2 products are empty, let's insert some mock products so we can seed orders!
    if (shop2Products.length === 0) {
      console.log("✏️ Shop2 products collection in 'emenu2' is empty. Inserting dummy products first...");
      const dummyProducts2 = [
        { name: "كابوتشينو", price: 7, price_regular: 7, price_bulk: 6, category: "مشروبات", availability: true },
        { name: "كرواسون شوكولاتة", price: 8, price_regular: 8, price_bulk: 7, category: "حلويات", availability: true },
        { name: "عصير برتقال طبيعي", price: 10, price_regular: 10, price_bulk: 9, category: "مشروبات", availability: true },
        { name: "ساندوتش تونة بالجبن", price: 12, price_regular: 12, price_bulk: 11, category: "موالح", availability: true },
        { name: "قهوة تركي", price: 5, price_regular: 5, price_bulk: 4, category: "مشروبات", availability: true }
      ];
      await productsColl2.insertMany(dummyProducts2);
      shop2Products = await productsColl2.find({}).toArray();
      console.log(`✓ Seeded ${shop2Products.length} dummy products into 'emenu2' db`);
    }
    
    console.log("🧹 Clearing old mock orders, customers, and favorites...");
    await ordersColl1.deleteMany({});
    await ordersColl2.deleteMany({});
    await customersColl.deleteMany({});
    await favoritesColl.deleteMany({});
    
    const now = new Date();
    const customerDocs = mockCustomers.map(c => ({
      phone: c.phone,
      name: c.name,
      lastActive: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)
    }));
    await customersColl.insertMany(customerDocs);
    console.log(`✓ Seeded ${customerDocs.length} customer profiles into 'emenu' db`);
    
    function randomPastDate(daysAgo) {
      const pastTime = now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000;
      return new Date(pastTime);
    }
    
    // Seed Shop 1 Orders
    if (shop1Products.length > 0) {
      const orders = [];
      for (let i = 0; i < 55; i++) {
        const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
        const orderDate = randomPastDate(30);
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedItems = [];
        let totalPrice = 0;
        
        for (let j = 0; j < numItems; j++) {
          const prod = shop1Products[Math.floor(Math.random() * shop1Products.length)];
          const quantity = Math.floor(Math.random() * 4) + 1;
          const price = prod.price_regular || prod.price || 10;
          totalPrice += price * quantity;
          
          selectedItems.push({
            productId: prod._id,
            name: prod.name,
            price: price,
            quantity: quantity,
            allowFloat: !!prod.allowFloat,
            notes: Math.random() > 0.8 ? "بدون مكسرات" : ""
          });
        }
        
        orders.push({
          customerInfo: {
            name: customer.name,
            phone: customer.phone
          },
          items: selectedItems,
          totalPrice: totalPrice,
          deliveryDate: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: Math.random() > 0.9 ? "توصيل للمنزل" : "",
          priceMode: priceModes[Math.floor(Math.random() * priceModes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          whatsappSent: true,
          createdAt: orderDate
        });
      }
      await ordersColl1.insertMany(orders);
      console.log(`✓ Seeded ${orders.length} orders for Shop1 in 'emenu' db`);
    }
    
    // Seed Shop 2 Orders
    if (shop2Products.length > 0) {
      const orders2 = [];
      for (let i = 0; i < 40; i++) {
        const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
        const orderDate = randomPastDate(30);
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedItems = [];
        let totalPrice = 0;
        
        for (let j = 0; j < numItems; j++) {
          const prod = shop2Products[Math.floor(Math.random() * shop2Products.length)];
          const quantity = Math.floor(Math.random() * 4) + 1;
          const price = prod.price_regular || prod.price || 15;
          totalPrice += price * quantity;
          
          selectedItems.push({
            productId: prod._id,
            name: prod.name,
            price: price,
            quantity: quantity,
            allowFloat: !!prod.allowFloat,
            notes: ""
          });
        }
        
        orders2.push({
          customerInfo: {
            name: customer.name,
            phone: customer.phone
          },
          items: selectedItems,
          totalPrice: totalPrice,
          deliveryDate: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: "",
          priceMode: priceModes[Math.floor(Math.random() * priceModes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          whatsappSent: true,
          createdAt: orderDate
        });
      }
      await ordersColl2.insertMany(orders2);
      console.log(`✓ Seeded ${orders2.length} orders for Shop2 in 'emenu2' db`);
    }
    
    // Seed Favorites
    const favorites = [];
    for (const c of mockCustomers) {
      if (shop1Products.length > 0) {
        const numFavs = Math.floor(Math.random() * 3) + 1;
        const selected = new Set();
        while (selected.size < numFavs) {
          selected.add(Math.floor(Math.random() * shop1Products.length));
        }
        for (const idx of selected) {
          const prod = shop1Products[idx];
          favorites.push({
            phone: c.phone,
            productId: prod._id,
            shop: 'shop1'
          });
        }
      }
      if (shop2Products.length > 0) {
        const numFavs = Math.floor(Math.random() * 2) + 1;
        const selected = new Set();
        while (selected.size < numFavs) {
          selected.add(Math.floor(Math.random() * shop2Products.length));
        }
        for (const idx of selected) {
          const prod = shop2Products[idx];
          favorites.push({
            phone: c.phone,
            productId: prod._id,
            shop: 'shop2'
          });
        }
      }
    }
    
    if (favorites.length > 0) {
      await favoritesColl.insertMany(favorites);
      console.log(`✓ Seeded ${favorites.length} favorite bookmarks in 'emenu' db`);
    }
    
    console.log("🎉 Database seeding completed successfully!");
  } catch (err) {
    console.error("✗ Seeding failed:", err);
  } finally {
    await client.close();
  }
}

run();
