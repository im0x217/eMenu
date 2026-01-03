require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multerS3({
  s3: s3Client,
  bucket: process.env.AWS_S3_BUCKET || "e-menu-products",
  acl: "public-read",  // Public read allows images to be displayed without signing
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    cb(null, 'products/' + filename);
  },
});

const upload = multer({ storage: storage });

// Error handler for multer/S3 upload errors
const uploadErrorHandler = (err, req, res, next) => {
  if (err && err.code === 'NoSuchBucket') {
    return res.status(503).json({ 
      error: "S3 bucket not found. Please run 'node create-s3-bucket.js' to set it up.",
      details: err.message
    });
  }
  if (err) {
    return res.status(400).json({ 
      error: `Upload error: ${err.message}`,
      code: err.code
    });
  }
  next();
};

// S3 files use public-read ACL - no signed URLs needed
// Images are directly accessible via the S3 URL
const getPublicUrl = (s3Url) => {
  // S3 URLs with public-read ACL are directly accessible
  return s3Url;
};

// Get display image (with fallback for missing or old images)
const getDisplayImage = (product) => {
  // If no image, use placeholder
  if (!product.img) {
    return {
      img: product.img,
      imgSigned: "/res/logo.jpg",
      needsImage: true
    };
  }
  
  // If it's an old Cloudinary URL, replace with placeholder
  if (product.img.includes('cloudinary.com')) {
    return {
      img: product.img,
      imgSigned: "/res/logo.jpg",
      needsImage: true
    };
  }
  
  // If it's an S3 URL, generate signed version (async not needed for now)
  if (product.img.includes('amazonaws.com')) {
    return {
      img: product.img,
      imgSigned: product.img, // Will be signed separately
      needsImage: false
    };
  }
  
  // Default: return as-is
  return {
    img: product.img,
    imgSigned: product.img,
    needsImage: false
  };
};

// S3 images are public-read, so no special handling needed
const attachS3Images = (items = []) => items;

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
let db2, productsCollection2, categoriesCollection2;
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

// ============ DEBUG ENDPOINTS ============
app.get("/api/debug/products-by-category", checkMongoDB, async (req, res) => {
  try {
    const categories = await categoriesCollection.find({}).toArray();
    const result = {};
    
    for (const cat of categories) {
      const count = await productsCollection.countDocuments({ category: cat.name });
      result[cat.name] = count;
    }
    
    res.json({
      shop: "shop1",
      categories: result,
      totalCategories: categories.length,
      totalProducts: await productsCollection.countDocuments({})
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/debug/purchase-types", checkMongoDB, async (req, res) => {
  try {
    const results = await productsCollection.aggregate([
      {
        $group: {
          _id: "$purchaseType",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    res.json({
      purchaseTypeDistribution: results,
      total: await productsCollection.countDocuments({})
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/debug/subcategories", checkMongoDB, async (req, res) => {
  try {
    const category = req.query.category;
    let query = {};
    if (category) {
      query = { category };
    }
    
    const results = await productsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$subCategory",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    res.json({
      category: category || "all",
      subCategories: results,
      total: await productsCollection.countDocuments(query)
    });
  } catch (err) {
    console.error("Debug endpoint error:", err);
    res.status(500).json({ error: err.message });
  }
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
    
    // Handle missing images - S3 images are public and directly accessible
    const productsWithUrls = await Promise.all(products.map(async (product) => {
      const imageData = getDisplayImage(product);
      
      // If it's S3, the URL is directly accessible (public-read ACL)
      if (product.img && product.img.includes('amazonaws.com')) {
        console.log("[S3 IMAGE] Using direct URL for:", product.name);
        imageData.imgSigned = product.img;  // No signing needed, images are public
      }
      
      return { ...product, ...imageData };
    }));
    
    res.json(productsWithUrls);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/products", checkAdmin, upload.single('img'), async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
  const img = req.file ? req.file.location : null;  // S3 location instead of path
  
  console.log("[UPLOAD DEBUG] POST /api/products");
  console.log("  File received:", req.file ? "Yes" : "No");
  console.log("  File details:", req.file ? { bucket: req.file.bucket, key: req.file.key, location: req.file.location } : null);
  console.log("  Form data:", { name, category, price_regular, price_bulk });
  
  if (
    !name ||
    !category ||
    !img ||
    (price_regular === undefined && price === undefined)
  ) {
    console.log("[UPLOAD ERROR] Missing fields - img:", img, "name:", name, "category:", category);
    return res.status(400).json({ error: "Missing required fields or image upload failed. Ensure S3 bucket exists." });
  }
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Upload error: ${req.fileValidationError}` });
  }
  try {
    await productsCollection.insertOne({
      name,
      desc,
      price_regular,
      price_bulk,
      price,
      img,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: allowFloat === 'true',
      purchaseType: purchaseType || 'both'
    });
    console.log("[UPLOAD SUCCESS] Product saved with image:", img);
    res.json({ success: true });
  } catch (err) {
    console.error("[UPLOAD ERROR] Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
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
      updateData.img = req.file.location;  // S3 location
  } else {
      updateData.img = existingImg;
  }

  if (
    !updateData.name ||
    !updateData.category ||
    !updateData.img ||
    (updateData.price_regular === undefined && updateData.price === undefined)
  ) {
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

// ============ SHOP2 API ROUTES ============
app.get("/api/shop2/categories", async (req, res) => {
  try {
    const cats = await categoriesCollection2.find({}).toArray();
    res.json(cats);
  } catch (err) {
    console.error("Error fetching shop2 categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/shop2/products", async (req, res) => {
  try {
    const { category, bulkSearch } = req.query;
    let query = {};
    if (bulkSearch) {
      query = { isBulk: true };
    } else if (category) {
      query = { category };
    }
    
    const products = await productsCollection2
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
    
    // Handle missing images - S3 images are public and directly accessible
    const productsWithUrls = await Promise.all(products.map(async (product) => {
      const imageData = getDisplayImage(product);
      
      // If it's S3, the URL is directly accessible (public-read ACL)
      if (product.img && product.img.includes('amazonaws.com')) {
        console.log("[S3 IMAGE] Using direct URL for:", product.name);
        imageData.imgSigned = product.img;  // No signing needed, images are public
      }
      
      return { ...product, ...imageData };
    }));
    
    res.json(productsWithUrls);
  } catch (err) {
    console.error("Error fetching shop2 products:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/api/shop2/products", checkAdmin, upload.single('img'), async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
  const img = req.file ? req.file.location : null;  // S3 location instead of path
  
  if (
    !name ||
    !category ||
    !img ||
    (price_regular === undefined && price === undefined)
  ) {
    return res.status(400).json({ error: "Missing required fields or image upload failed. Ensure S3 bucket exists." });
  }
  await productsCollection2.insertOne({
    name,
    desc,
    price_regular,
    price_bulk,
    price,
    img,
    category,
    subCategory,
    available: available !== "false",
    allowFloat: allowFloat === "true",
    purchaseType: purchaseType || "both",
  });
  res.json({ success: true });
});

app.put("/api/shop2/products/:id", checkAdmin, upload.single('img'), async (req, res) => {
  try {
    const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
    const product = await productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const img = req.file ? req.file.location : product.img;

    await productsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          name,
          desc,
          price_regular,
          price_bulk,
          price,
          img,
          category,
          subCategory,
          available: available !== "false",
          allowFloat: allowFloat === "true",
          purchaseType: purchaseType || "both",
        },
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/shop2/products/:id", checkAdmin, async (req, res) => {
  try {
    await productsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// ============ SHOP2 ADMIN ROUTES ============
app.post("/api/shop2/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.cookie("admin_shop2", "true", { httpOnly: true, sameSite: "Strict", secure: true });
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: "Unauthorized" });
});

app.get("/api/shop2/admin-check", (req, res) => {
  const isAdmin = req.cookies.admin_shop2 === "true";
  if (!isAdmin) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ ok: true });
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
  db2 = client.db("emenu2");
  productsCollection = db.collection("products");
  categoriesCollection = db.collection("categories");
  productsCollection2 = db2.collection("products");
  categoriesCollection2 = db2.collection("categories");
  mongoConnected = true;
  
  productsCollection.createIndex({ category: 1 });
  categoriesCollection.createIndex({ name: 1 }, { unique: true });
  productsCollection2.createIndex({ category: 1 });
  categoriesCollection2.createIndex({ name: 1 }, { unique: true });

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

  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('✗ MongoDB connection failed:', err.message);
  app.listen(PORT, () => {
    console.log(`⚠️  Server running on port ${PORT} (MongoDB connection pending...)`);
  });
});
