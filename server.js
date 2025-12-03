require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "e-menu-products",
    format: async (req, file) => "jpg",
    public_id: (req, file) => Date.now() + '-' + file.originalname,
  },
});

const upload = multer({ storage: storage });

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";
const MONGO_URI = process.env.MONGO_URI;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.static(__dirname));

console.log("[INIT] Registering API routes...");

// ============ STATE ============
let db, productsCollection, categoriesCollection;
let mongoConnected = false;

// ============ MIDDLEWARE ============
const checkMongoDB = (req, res, next) => {
  if (!mongoConnected) {
    return res.status(503).json({ error: "Database not ready" });
  }
  next();
};

const checkAdmin = (req, res, next) => {
  if (req.cookies.admin === "true") return next();
  res.status(403).json({ success: false, message: "Forbidden" });
};

// ============ HEALTH CHECK ============
app.get("/api/health", (req, res) => {
  console.log("[ROUTE] GET /api/health called");
  res.json({ 
    status: "ok", 
    message: "Server is running",
    mongoConnected: mongoConnected
  });
});

// ============ LOGIN ============
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.cookie("admin", "true", { httpOnly: true, sameSite: "Strict", secure: true });
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: "Unauthorized" });
});

app.get("/api/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

// ============ PRODUCTS API ============
app.get("/api/products", checkMongoDB, async (req, res) => {
  try {
    const { category, id } = req.query;
    let query = {};

    if (id) {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }
      query = { _id: new ObjectId(id) };
    } else if (category) {
      query = { category };
    }
    
    const products = await productsCollection
      .find(query, {
        projection: {
          name: 1,
          desc: 1,
          price: 1,
          price_regular: 1,
          price_bulk: 1,
          img: 1,
          category: 1,
          subCategory: 1,
          available: 1,
          cloudinary_public_id: 1,
          allowFloat: 1,
          purchaseType: 1,
        },
      })
      .sort({ name: 1 })
      .toArray();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", checkAdmin, upload.single('img'), async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
  const img = req.file ? req.file.path : null;
  const cloudinary_public_id = req.file ? req.file.filename : null;
  
  if (
    !name ||
    !category ||
    !img ||
    (price_regular === undefined && price === undefined)
  ) {
    if(cloudinary_public_id) await cloudinary.uploader.destroy(cloudinary_public_id);
    return res.status(400).json({ error: "Missing required fields" });
  }
  await productsCollection.insertOne({
    name,
    desc,
    price_regular,
    price_bulk,
    price,
    img,
    cloudinary_public_id,
    category,
    subCategory,
    available: available === "false" ? false : true,
    allowFloat: allowFloat === 'true',
    purchaseType: purchaseType || 'both'
  });
  res.json({ success: true });
});

app.put("/api/products/:id", checkAdmin, upload.single('img'), async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, existingImg, allowFloat, purchaseType } = req.body;
  
  let updateData = {
      name,
      desc,
      price_regular,
      price_bulk,
      price,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: allowFloat === 'true',
      purchaseType: purchaseType || 'both'
  };

  if (req.file) {
      updateData.img = req.file.path;
      updateData.cloudinary_public_id = req.file.filename;

      const old_public_id = req.body.cloudinary_public_id;
      if (old_public_id && old_public_id !== 'null' && old_public_id !== 'undefined') {
          cloudinary.uploader.destroy(old_public_id).catch(err => 
              console.error("Failed to delete old image:", err)
          );
      }
  } else {
      updateData.img = existingImg;
      updateData.cloudinary_public_id = req.body.cloudinary_public_id;
  }

  if (
    !updateData.name ||
    !updateData.category ||
    !updateData.img ||
    (updateData.price_regular === undefined && updateData.price === undefined)
  ) {
    if(req.file) await cloudinary.uploader.destroy(req.file.filename);
    return res.status(400).json({ error: "Missing required fields" });
  }

  await productsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updateData }
  );
  res.json({ success: true });
});

app.patch("/api/products/:id/availability", checkAdmin, async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
      return res.status(400).json({ error: "Invalid available status" });
  }
  try {
      await productsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { available: available } }
      );
      res.json({ success: true });
  } catch (err) {
      console.error("Error updating availability:", err);
      res.status(500).json({ error: "Failed to update availability" });
  }
});

app.delete("/api/products/:id", checkAdmin, async (req, res) => {
  try {
    const product = await productsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (product && product.cloudinary_public_id) {
      await cloudinary.uploader.destroy(product.cloudinary_public_id);
    }
    await productsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ============ CATEGORIES API ============
app.get("/api/categories", checkMongoDB, async (req, res) => {
  console.log("[ROUTE] GET /api/categories called");
  try {
    const categories = await categoriesCollection.find({}).toArray();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await categoriesCollection.insertOne({ name, emoji, subCategories: subCategories || [] });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    await categoriesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, emoji, subCategories: subCategories || [] } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    await categoriesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============ CONNECT TO MONGODB ============
MongoClient.connect(MONGO_URI).then(async (client) => {
  console.log("✓ MongoDB connected successfully");
  db = client.db("emenu");
  productsCollection = db.collection("products");
  categoriesCollection = db.collection("categories");
  mongoConnected = true;
  
  productsCollection.createIndex({ category: 1 });
  categoriesCollection.createIndex({ name: 1 }, { unique: true });

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

  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('✗ MongoDB connection failed:', err.message);
  app.listen(PORT, () => {
    console.log(`⚠️  Server running on port ${PORT} (MongoDB connection pending...)`);
  });
});
