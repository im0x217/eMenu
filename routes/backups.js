const express = require('express');

module.exports = function createBackupsRouter(context) {
  const router = express.Router();
  const { ObjectId } = require('mongodb');
  const { 
    checkMongoDB, checkAdmin, checkCustomerAuth, customerLimiter, 
    getNextOrderNumber, findCustomerByPhone, MONGO_URI,
    getOrderEffectiveDateStr, generateCustomerToken
  } = context;

router.post("/api/admin/backup", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { label } = req.body;
    console.log("[BACKUP] Creating full database backup...");

    // Dump all collections from both databases
    const [
      products, categories, tags, orders, customers, favorites,
      payments, counters, chefs, carousel, adminUsers,
      products2, categories2, tags2, orders2, chefs2
    ] = await Promise.all([
      productsCollection.find({}).toArray(),
      categoriesCollection.find({}).toArray(),
      tagsCollection.find({}).toArray(),
      ordersCollection.find({}).toArray(),
      customersCollection.find({}).toArray(),
      favoritesCollection.find({}).toArray(),
      paymentsCollection.find({}).toArray(),
      countersCollection.find({}).toArray(),
      chefsCollection.find({}).toArray(),
      carouselCollection.find({}).toArray(),
      adminUsersCollection.find({}).toArray(),
      productsCollection2.find({}).toArray(),
      categoriesCollection2.find({}).toArray(),
      tagsCollection2.find({}).toArray(),
      ordersCollection2.find({}).toArray(),
      chefsCollection2.find({}).toArray()
    ]);

    const backupDoc = {
      createdAt: new Date(),
      label: label || `نسخة احتياطية - ${new Date().toLocaleString('ar-LY')}`,
      collections: {
        "emenu.products": products,
        "emenu.categories": categories,
        "emenu.tags": tags,
        "emenu.orders": orders,
        "emenu.customers": customers,
        "emenu.favorites": favorites,
        "emenu.payments": payments,
        "emenu.counters": counters,
        "emenu.chefs": chefs,
        "emenu.marketing_carousel": carousel,
        "emenu.admin_users": adminUsers,
        "emenu2.products": products2,
        "emenu2.categories": categories2,
        "emenu2.tags": tags2,
        "emenu2.orders": orders2,
        "emenu2.chefs": chefs2
      },
      stats: {
        "emenu.products": products.length,
        "emenu.categories": categories.length,
        "emenu.tags": tags.length,
        "emenu.orders": orders.length,
        "emenu.customers": customers.length,
        "emenu.favorites": favorites.length,
        "emenu.payments": payments.length,
        "emenu.counters": counters.length,
        "emenu.chefs": chefs.length,
        "emenu.marketing_carousel": carousel.length,
        "emenu.admin_users": adminUsers.length,
        "emenu2.products": products2.length,
        "emenu2.categories": categories2.length,
        "emenu2.tags": tags2.length,
        "emenu2.orders": orders2.length,
        "emenu2.chefs": chefs2.length
      }
    };

    const result = await backupsCollection.insertOne(backupDoc);
    console.log(`[BACKUP] Backup created successfully: ${result.insertedId}`);

    res.json({
      success: true,
      message: "تم إنشاء النسخة الاحتياطية بنجاح",
      backupId: result.insertedId,
      stats: backupDoc.stats
    });
  } catch (err) {
    console.error("Backup creation error:", err);
    res.status(500).json({ success: false, error: "فشل في إنشاء النسخة الاحتياطية" });
  }
});

// List all backups (metadata only)
router.get("/api/admin/backups", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const backups = await backupsCollection.find({}, {
      projection: { collections: 0 } // Exclude full data, return only metadata + stats
    }).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, backups });
  } catch (err) {
    console.error("List backups error:", err);
    res.status(500).json({ success: false, error: "فشل في جلب قائمة النسخ الاحتياطية" });
  }
});

// Download a backup as JSON
router.get("/api/admin/backup/:id/download", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const backup = await backupsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!backup) {
      return res.status(404).json({ success: false, error: "النسخة الاحتياطية غير موجودة" });
    }

    const filename = `emenu-backup-${backup.createdAt.toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    console.error("Backup download error:", err);
    res.status(500).json({ success: false, error: "فشل في تحميل النسخة الاحتياطية" });
  }
});

// Delete a backup
router.delete("/api/admin/backup/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const result = await backupsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "النسخة الاحتياطية غير موجودة" });
    }
    res.json({ success: true, message: "تم حذف النسخة الاحتياطية" });
  } catch (err) {
    console.error("Backup delete error:", err);
    res.status(500).json({ success: false, error: "فشل في حذف النسخة الاحتياطية" });
  }
});

// Reset orders, payments, and optionally customer balances
router.post("/api/admin/reset/orders", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { confirm, resetCustomerBalances } = req.body;

    if (confirm !== "RESET_ALL_ORDERS") {
      return res.status(400).json({ success: false, error: "رمز التأكيد غير صحيح" });
    }

    console.log("[RESET] Starting orders/payments reset...");

    // Delete all orders and payments
    const [ordersResult, orders2Result, paymentsResult] = await Promise.all([
      ordersCollection.deleteMany({}),
      ordersCollection2.deleteMany({}),
      paymentsCollection.deleteMany({})
    ]);

    // Reset the order counter back to 1000 (next order will be 1001)
    await countersCollection.updateOne(
      { _id: "orderNumber" },
      { $set: { seq: 1000 } },
      { upsert: true }
    );

    let customersReset = 0;
    if (resetCustomerBalances) {
      const custResult = await customersCollection.updateMany(
        {},
        { $set: { outstandingBalance: 0, totalSpent: 0, paidAmount: 0 } }
      );
      customersReset = custResult.modifiedCount;
      console.log(`[RESET] Reset ${customersReset} customer balances`);
    }

    console.log(`[RESET] Deleted: ${ordersResult.deletedCount} shop1 orders, ${orders2Result.deletedCount} shop2 orders, ${paymentsResult.deletedCount} payments`);

    res.json({
      success: true,
      message: "تم مسح جميع بيانات الطلبات والمبيعات بنجاح",
      deleted: {
        shop1Orders: ordersResult.deletedCount,
        shop2Orders: orders2Result.deletedCount,
        payments: paymentsResult.deletedCount,
        customersReset
      }
    });
  } catch (err) {
    console.error("Reset orders error:", err);
    res.status(500).json({ success: false, error: "فشل في مسح البيانات" });
  }
});

// ============ CONNECT TO MONGODB ============
const connectWithRetry = async () => {
  try {
    const client = await MongoClient.connect(MONGO_URI);
    console.log("✓ MongoDB connected successfully");
    db = client.db("emenu");
    db2 = client.db("emenu2");
    productsCollection = db.collection("products");
    categoriesCollection = db.collection("categories");
    tagsCollection = db.collection("tags");
    productsCollection2 = db2.collection("products");
    categoriesCollection2 = db2.collection("categories");
    tagsCollection2 = db2.collection("tags");
    customersCollection = db.collection("customers");
    favoritesCollection = db.collection("favorites");
    ordersCollection = db.collection("orders");
    ordersCollection2 = db2.collection("orders");
    carouselCollection = db.collection("marketing_carousel");
    adminUsersCollection = db.collection("admin_users");
    paymentsCollection = db.collection("payments");
    countersCollection = db.collection("counters");
    chefsCollection = db.collection("chefs");
    chefsCollection2 = db2.collection("chefs");
    backupsCollection = db.collection("backups");
    telemetryCollection = db.collection("telemetry");
    mongoConnected = true;
    
    productsCollection.createIndex({ category: 1 });
    categoriesCollection.createIndex({ name: 1 }, { unique: true });
    tagsCollection.createIndex({ name: 1 }, { unique: true });
    productsCollection2.createIndex({ category: 1 });
    categoriesCollection2.createIndex({ name: 1 }, { unique: true });
    tagsCollection2.createIndex({ name: 1 }, { unique: true });
    customersCollection.createIndex({ phone: 1 }, { unique: true });
    favoritesCollection.createIndex({ phone: 1, productId: 1, shop: 1 }, { unique: true });
    ordersCollection.createIndex({ "customerInfo.phone": 1 });
    ordersCollection.createIndex({ orderNumber: 1 });
    ordersCollection.createIndex({ createdAt: -1 });
    ordersCollection.createIndex({ deliveryDate: 1 });
    ordersCollection.createIndex({ status: 1, paymentStatus: 1 });
    ordersCollection.createIndex({ "customerInfo.phone": 1, createdAt: -1 });
    ordersCollection.createIndex({ cancelledAt: 1 }, { expireAfterSeconds: 86400 });

    ordersCollection2.createIndex({ "customerInfo.phone": 1 });
    ordersCollection2.createIndex({ orderNumber: 1 });
    ordersCollection2.createIndex({ createdAt: -1 });
    ordersCollection2.createIndex({ deliveryDate: 1 });
    ordersCollection2.createIndex({ status: 1, paymentStatus: 1 });
    ordersCollection2.createIndex({ "customerInfo.phone": 1, createdAt: -1 });
    ordersCollection2.createIndex({ cancelledAt: 1 }, { expireAfterSeconds: 86400 });

    adminUsersCollection.createIndex({ username: 1 }, { unique: true });
    chefsCollection.createIndex({ name: 1 });
    chefsCollection2.createIndex({ name: 1 });

    // Telemetry indexes with 30-day automatic pruning TTL
    telemetryCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 86400 });
    telemetryCollection.createIndex({ sessionId: 1 });
    telemetryCollection.createIndex({ event: 1 });
    telemetryCollection.createIndex({ shop: 1, timestamp: -1 });

    // Payment collection indexes
    paymentsCollection.createIndex({ customerPhone: 1, createdAt: -1 });
    paymentsCollection.createIndex({ createdAt: -1 });
    paymentsCollection.createIndex({ "distributedTo.orderId": 1 });

    // Initialize order counter and backfill legacy orders without orderNumber
    try {
      const counterDoc = await countersCollection.findOne({ _id: "orderNumber" });
      if (!counterDoc) {
        const shop1Legacy = await ordersCollection.find({ orderNumber: { $exists: false } }).sort({ createdAt: 1 }).toArray();
        const shop2Legacy = await ordersCollection2.find({ orderNumber: { $exists: false } }).sort({ createdAt: 1 }).toArray();

        const allUnassigned = [...shop1Legacy.map(o => ({ ...o, _src: 'shop1' })), ...shop2Legacy.map(o => ({ ...o, _src: 'shop2' }))]
          .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

        let currentSeq = 1000;
        for (const ord of allUnassigned) {
          currentSeq++;
          const targetColl = ord._src === 'shop2' ? ordersCollection2 : ordersCollection;
          await targetColl.updateOne({ _id: ord._id }, { $set: { orderNumber: currentSeq } });
        }

        await countersCollection.updateOne(
          { _id: "orderNumber" },
          { $set: { seq: currentSeq } },
          { upsert: true }
        );
        console.log(`✓ Initialized orderNumber counter at #${currentSeq} (backfilled ${allUnassigned.length} orders)`);
      }
    } catch (counterErr) {
      console.error("Order counter initialization warning:", counterErr);
    }

    // Migrate existing products to have makingCost: 0 if not present
    try {
      await productsCollection.updateMany(
        { $or: [{ makingCost: { $exists: false } }, { makingCost: null }] },
        { $set: { makingCost: 0 } }
      );
      await productsCollection2.updateMany(
        { $or: [{ makingCost: { $exists: false } }, { makingCost: null }] },
        { $set: { makingCost: 0 } }
      );
      console.log("✓ Products makingCost migration check completed");
    } catch (migErr) {
      console.warn("Product makingCost migration warning:", migErr.message);
    }

    // Seed default admin user if empty
    const userCount = await adminUsersCollection.countDocuments();
    if (userCount === 0) {
      console.log("Initializing default admin user...");
      await adminUsersCollection.insertOne({
        name: "المدير العام",
        username: ADMIN_USER,
        password: ADMIN_PASS,
        role: "admin",
        shopAccess: "all",
        createdAt: new Date()
      });
      console.log("✓ Default admin user initialized");
    }

    const count = await categoriesCollection.countDocuments();
    if (count === 0) {
      console.log("Initializing categories...");
      const initialCategories = [
          { name: "الشرقي", emoji: "🍯", subCategories: ["صنف فرعي 1", "صنف فرعي 2"] },
          { name: "الغربي", emoji: "🍰", subCategories: ["كيكات", "تورتات مقصوصة", "جاتوه"] },
          { name: "عبمبر", emoji: "💖", subCategories: [] },
          { name: "تورتات", emoji: "🎂", subCategories: ["تورتة زمنية", "تورتات الشنتى", "تورتات درجة اولى", "مناسبات", "عيد ميلاد"] },
          { name: "عصائر", emoji: "🥤", subCategories: ["طبيعي", "غازي"] },
          { name: "نواشف", emoji: "🥐", subCategories: ["معجنات", "مالح", "حلو"] },
          { name: "لوزيات", emoji: "🥜", subCategories: ["شكلاطة"] },
          { name: "خدمات", emoji: "🛎️", subCategories: [] },
      ];
      await categoriesCollection.insertMany(initialCategories);
      console.log("✓ Categories initialized");
    } else {
      console.log(`✓ Found ${count} existing categories`);
    }

    const count2 = await categoriesCollection2.countDocuments();
    if (count2 === 0) {
      console.log("Initializing shop2 categories...");
      const initialCategories2 = [
          { name: "فئة أولى", emoji: "🎁", subCategories: ["نوع أول", "نوع ثاني"] },
          { name: "فئة ثانية", emoji: "⭐", subCategories: [] },
          { name: "فئة ثالثة", emoji: "🌟", subCategories: [] },
      ];
      await categoriesCollection2.insertMany(initialCategories2);
      console.log("✓ Shop2 categories initialized");
    } else {
      console.log(`✓ Found ${count2} existing shop2 categories`);
    }

    // Run initial cleanup of expired cancelled orders (>24h)
    try {
      await cleanupExpiredCancelledOrders();
    } catch (cleanErr) {
      console.warn("Initial cancelled orders cleanup warning:", cleanErr.message);
    }
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message, '- Retrying in 5s...');
    mongoConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

// ============ AUTOMATIC 24H CANCELLED ORDERS CLEANUP ============
const cleanupExpiredCancelledOrders = async () => {
  if (!mongoConnected || !ordersCollection || !ordersCollection2) {
    return { success: false, reason: "Database not connected" };
  }
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Delete cancelled orders where cancelledAt <= 24 hours ago
    const delRes1 = await ordersCollection.deleteMany({
      status: "cancelled",
      cancelledAt: { $lte: cutoff }
    });
    const delRes2 = await ordersCollection2.deleteMany({
      status: "cancelled",
      cancelledAt: { $lte: cutoff }
    });

    // 2. Handle legacy cancelled orders that lack cancelledAt:
    // If (updatedAt || createdAt) is older than 24h, delete them.
    // If younger, backfill cancelledAt so TTL index and future cleanups can track them.
    const legacyShop1 = await ordersCollection.find({
      status: "cancelled",
      $or: [{ cancelledAt: { $exists: false } }, { cancelledAt: null }]
    }).toArray();

    let legacyDel1 = 0;
    for (const ord of legacyShop1) {
      const refDate = new Date(ord.updatedAt || ord.createdAt || 0);
      if (refDate <= cutoff) {
        await ordersCollection.deleteOne({ _id: ord._id });
        legacyDel1++;
      } else {
        await ordersCollection.updateOne({ _id: ord._id }, { $set: { cancelledAt: refDate } });
      }
    }

    const legacyShop2 = await ordersCollection2.find({
      status: "cancelled",
      $or: [{ cancelledAt: { $exists: false } }, { cancelledAt: null }]
    }).toArray();

    let legacyDel2 = 0;
    for (const ord of legacyShop2) {
      const refDate = new Date(ord.updatedAt || ord.createdAt || 0);
      if (refDate <= cutoff) {
        await ordersCollection2.deleteOne({ _id: ord._id });
        legacyDel2++;
      } else {
        await ordersCollection2.updateOne({ _id: ord._id }, { $set: { cancelledAt: refDate } });
      }
    }

    const totalDeleted = (delRes1.deletedCount || 0) + (delRes2.deletedCount || 0) + legacyDel1 + legacyDel2;
    if (totalDeleted > 0) {
      console.log(`✓ [Auto-Cleanup] Permanently deleted ${totalDeleted} expired cancelled order(s) (>24h).`);
    }
    return {
      success: true,
      totalDeleted,
      shop1Deleted: (delRes1.deletedCount || 0) + legacyDel1,
      shop2Deleted: (delRes2.deletedCount || 0) + legacyDel2
    };
  } catch (cleanErr) {
    console.error("✗ [Auto-Cleanup] Error during cancelled orders cleanup:", cleanErr);
    return { success: false, error: cleanErr.message };
  }
};

// Admin endpoint to manually trigger cancelled orders cleanup


  return router;
};
