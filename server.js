require('dotenv').config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const crypto = require("crypto");

// Secure dynamic session tokens generated on server start
const SESSION_TOKEN_SHOP1 = crypto.randomBytes(32).toString('hex');
const SESSION_TOKEN_SHOP2 = crypto.randomBytes(32).toString('hex');

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
  // Ensure proper content type and long-term caching for faster repeat loads
  contentType: multerS3.AUTO_CONTENT_TYPE,
  cacheControl: 'public, max-age=31536000',
  // ACL removed - bucket policy makes all objects public
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const filename = Date.now() + '-' + file.originalname;
    cb(null, 'products/' + filename);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

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

const parsePrice = (val, allowFloat) => {
  if (val === undefined || val === null || val === "" || val === "null" || val === "undefined") return null;
  const parsed = allowFloat ? parseFloat(val) : parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
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

// Helper to delete a product's image from S3
const deleteProductImageFromS3 = async (product) => {
  if (!product || !product.img) return;
  
  let s3Key = null;
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  
  if (product.img.includes('amazonaws.com') || (cloudfrontDomain && product.img.includes(cloudfrontDomain))) {
    const index = product.img.indexOf('products/');
    if (index !== -1) {
      s3Key = product.img.substring(index);
    }
  }
  
  if (s3Key) {
    try {
      console.log("[S3 DELETE] Attempting to delete S3 object:", s3Key);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || "e-menu-products",
        Key: s3Key
      }));
      console.log("[S3 DELETE] Successfully deleted image:", s3Key);
    } catch (err) {
      console.error("[S3 DELETE ERROR] Failed to delete image:", s3Key, err.message);
    }
  }
};

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
app.use(express.static(path.join(__dirname, "public")));

console.log("[INIT] Registering API routes...");

// ============ STATE ============
let db, productsCollection, categoriesCollection, tagsCollection;
let db2, productsCollection2, categoriesCollection2, tagsCollection2;
let customersCollection, favoritesCollection, ordersCollection, ordersCollection2, carouselCollection, adminUsersCollection, paymentsCollection;
let mongoConnected = false;

// ============ MIDDLEWARE ============
const checkMongoDB = (req, res, next) => {
  if (!mongoConnected) {
    return res.status(503).json({ error: "Database not ready" });
  }
  next();
};

const checkAdmin = (req, res, next) => {
  // Accept legacy cookie, shop2 cookie, OR Authorization header for mobile compatibility
  const isAdmin = req.cookies.admin === "true" || 
                  req.cookies.admin_shop2 === "true" ||
                  req.headers.authorization === `Bearer ${SESSION_TOKEN_SHOP1}` ||
                  req.headers.authorization === `Bearer ${SESSION_TOKEN_SHOP2}`;
  if (isAdmin) return next();
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
app.get("/api/debug/products-by-category", checkMongoDB, checkAdmin, async (req, res) => {
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

app.get("/api/debug/purchase-types", checkMongoDB, checkAdmin, async (req, res) => {
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

app.get("/api/debug/subcategories", checkMongoDB, checkAdmin, async (req, res) => {
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
// ============ RATE LIMITING ============
const createRateLimiter = (windowMs, maxRequests) => {
  const ipCache = new Map();
  
  // Cleanup interval to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipCache.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        ipCache.delete(ip);
      } else {
        ipCache.set(ip, valid);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000)); // Run at most every 5 mins

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();
    
    if (!ipCache.has(ip)) {
      ipCache.set(ip, []);
    }
    
    const timestamps = ipCache.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    ipCache.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
      console.log(`[RATE LIMIT EXCEEDED] IP: ${ip} exceeded limit.`);
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
};

const loginLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 per 15 min
const customerLimiter = createRateLimiter(5 * 60 * 1000, 60); // 60 per 5 min

app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  // 1. Search database users
  if (mongoConnected) {
    try {
      const user = await adminUsersCollection.findOne({ username: username.trim(), password: password.trim() });
      if (user) {
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie("admin", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
        return res.json({ 
          success: true, 
          token: SESSION_TOKEN_SHOP1,
          role: user.role || "admin",
          name: user.name || user.username,
          shopAccess: user.shopAccess || "all"
        });
      }
    } catch (e) {
      console.error("Login DB check error:", e);
    }
  }

  // 2. Fallback ENV check
  if (username.trim() === ADMIN_USER && password.trim() === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
    return res.json({ success: true, token: SESSION_TOKEN_SHOP1, role: "admin", name: "المدير العام", shopAccess: "all" });
  }

  res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

app.get("/api/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

// Public endpoint to list available admin/staff user accounts for login dropdown selector
app.get("/api/public/admin-users", async (req, res) => {
  try {
    let users = [];
    if (mongoConnected && adminUsersCollection) {
      users = await adminUsersCollection.find({}, { projection: { username: 1, name: 1, role: 1 } }).sort({ name: 1 }).toArray();
    }
    if (!users || users.length === 0) {
      users = [{ username: ADMIN_USER, name: "المدير العام", role: "admin" }];
    }
    res.json({ success: true, users });
  } catch (err) {
    console.error("Public admin users fetch error:", err);
    res.json({ success: true, users: [{ username: ADMIN_USER, name: "المدير العام", role: "admin" }] });
  }
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
      if (typeof category !== 'string') {
        return res.status(400).json({ error: "Invalid category format" });
      }
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
          tags: 1,
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

app.post("/api/verify-bulk-code", (req, res) => {
  const { code } = req.body;
  const BULK_CODE = process.env.BULK_CODE || "1234";
  if (code === BULK_CODE) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid code" });
  }
});

app.post("/api/products", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, tags } = req.body;
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  // Check for file validation errors first
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}`, warning: "Product will use placeholder image." });
  }
  
  // Always compute stable public URL using bucket + region + key, prefer CloudFront if configured
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg"; // Default placeholder
  let uploadWarning = null;
  
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    console.log("[UPLOAD SUCCESS] POST /api/products - File uploaded:", req.file.key);
  } else {
    uploadWarning = "Image upload failed - using placeholder. Check S3 configuration or file size/type.";
    console.log("[UPLOAD WARNING] POST /api/products - No file received, using placeholder");
  }
  
  console.log("[UPLOAD DEBUG] POST /api/products");
  console.log("  File received:", req.file ? "Yes" : "No");
  console.log("  Form data:", { name, category, price_regular, price_bulk });
  
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);

  const hasSomePrice = parsedPriceRegular !== null || parsedPrice !== null || (purchaseType === 'bulk' && parsedPriceBulk !== null);
  if (
    !name ||
    !category ||
    !hasSomePrice
  ) {
    console.log("[UPLOAD ERROR] Missing required fields - name:", name, "category:", category);
    return res.status(400).json({ error: "Missing required fields (name, category, or price)." });
  }
  try {
    await productsCollection.insertOne({
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      img,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags
    });
    console.log("[UPLOAD SUCCESS] Product saved with image:", img);
    res.json({ success: true });
  } catch (err) {
    console.error("[UPLOAD ERROR] Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags } = req.body;
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  let updateData = {
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags
  };

  let uploadWarning = null;
  
  if (req.file) {
      // Compute deterministic public URL for updated image, prefer CloudFront if configured
      const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      updateData.img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    } else {
      // Use existing image, or placeholder if null/invalid
      if (existingImg && existingImg !== 'null' && existingImg !== 'undefined') {
        updateData.img = existingImg;
      } else {
        updateData.img = "/res/logo.jpg";
        uploadWarning = "No valid image found - using placeholder.";
      }
  }

  const hasSomePrice = updateData.price_regular !== null || updateData.price !== null || (updateData.purchaseType === 'bulk' && updateData.price_bulk !== null);
  if (
    !updateData.name ||
    !updateData.category ||
    !hasSomePrice
  ) {
    return res.status(400).json({ error: "Missing required fields (name, category, or price)" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    await productsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.patch("/api/products/:id/availability", checkAdmin, async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
      return res.status(400).json({ error: "Invalid available status" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await productsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (product) {
      await deleteProductImageFromS3(product);
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
    const { name, icon, emoji, subCategories } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required category name" });
    }
    const result = await categoriesCollection.insertOne({ 
      name, 
      icon: icon || '', 
      emoji: emoji || '', 
      subCategories: subCategories || [] 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    const { name, icon, emoji, subCategories } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing required category name" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await categoriesCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, icon: icon || '', emoji: emoji || '', subCategories: subCategories || [] } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await categoriesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ============ TAGS API ============
app.get("/api/tags", checkMongoDB, async (req, res) => {
  try {
    const tags = await tagsCollection.find({}).toArray();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

app.post("/api/tags", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const result = await tagsCollection.insertOne({ 
      name, 
      color: color || 'default', 
      icon: icon || 'heart' 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

app.put("/api/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await tagsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, color: color || 'default', icon: icon || 'heart' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

app.delete("/api/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await tagsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// ============ SHOP2 API ROUTES ============
app.get("/api/shop2/categories", checkMongoDB, async (req, res) => {
  try {
    const cats = await categoriesCollection2.find({}).toArray();
    res.json(cats);
  } catch (err) {
    console.error("Error fetching shop2 categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/shop2/categories", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await categoriesCollection2.insertOne({ name, emoji, subCategories: subCategories || [] });
    res.status(201).json(result);
  } catch (err) {
    console.error("Error creating shop2 category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/shop2/categories/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, emoji, subCategories } = req.body;
    if (!name || !emoji) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await categoriesCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, emoji, subCategories: subCategories || [] } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating shop2 category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/shop2/categories/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await categoriesCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting shop2 category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

app.get("/api/shop2/tags", checkMongoDB, async (req, res) => {
  try {
    const tags = await tagsCollection2.find({}).toArray();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

app.post("/api/shop2/tags", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    const result = await tagsCollection2.insertOne({ 
      name, 
      color: color || 'default', 
      icon: icon || 'heart' 
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

app.put("/api/shop2/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await tagsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, color: color || 'default', icon: icon || 'heart' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

app.delete("/api/shop2/tags/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    await tagsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

app.get("/api/shop2/products", checkMongoDB, async (req, res) => {
  try {
    const { category, bulkSearch } = req.query;
    let query = {};
    if (bulkSearch) {
      query = { isBulk: true };
    } else if (category) {
      if (typeof category !== 'string') {
        return res.status(400).json({ error: "Invalid category format" });
      }
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
          tags: 1,
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

app.post("/api/shop2/products", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, tags } = req.body;
  
  let parsedTags = [];
  try {
    if (tags) parsedTags = JSON.parse(tags);
  } catch (e) {
    console.error("Failed to parse tags:", tags);
  }
  
  // Check for file validation errors first
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}`, warning: "Product will use placeholder image." });
  }
  
  // Prefer CloudFront domain for image delivery if configured
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg"; // Default placeholder
  let uploadWarning = null;
  
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
  } else {
    uploadWarning = "Image upload failed - using placeholder. Check S3 configuration or file size/type.";
  }
  
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);

  const hasSomePrice = parsedPriceRegular !== null || parsedPrice !== null || (purchaseType === 'bulk' && parsedPriceBulk !== null);
  if (
    !name ||
    !category ||
    !hasSomePrice
  ) {
    return res.status(400).json({ error: "Missing required fields (name, category, or price)." });
  }
  try {
    await productsCollection2.insertOne({
      name,
      desc,
      price_regular: parsedPriceRegular,
      price_bulk: parsedPriceBulk,
      price: parsedPrice,
      img,
      category,
      subCategory,
      available: available !== "false",
      allowFloat: isFloat,
      purchaseType: purchaseType || "both",
      tags: parsedTags
    });
    console.log("[UPLOAD SUCCESS] Shop2 product saved with image:", img);
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    console.error("[UPLOAD ERROR] Shop2 database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/shop2/products/:id", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  try {
    const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags } = req.body;
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });

    let parsedTags = [];
    try {
      if (tags) parsedTags = JSON.parse(tags);
    } catch (e) {
      console.error("Failed to parse tags:", tags);
    }

    // Prefer CloudFront domain for image delivery if configured
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    let img;
    let uploadWarning = null;
    
    if (req.file) {
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    } else {
      // Use existing image from request or product, or placeholder if null/invalid
      const existingImage = existingImg || product.img;
      if (existingImage && existingImage !== 'null' && existingImage !== 'undefined') {
        img = existingImage;
      } else {
        img = "/res/logo.jpg";
        uploadWarning = "No valid image found - using placeholder.";
      }
    }

    const isFloat = allowFloat === "true";
    const parsedPriceRegular = parsePrice(price_regular, isFloat);
    const parsedPriceBulk = parsePrice(price_bulk, isFloat);
    const parsedPrice = parsePrice(price, isFloat);

    await productsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          name,
          desc,
          price_regular: parsedPriceRegular,
          price_bulk: parsedPriceBulk,
          price: parsedPrice,
          img,
          category,
          subCategory,
          available: available !== "false",
          allowFloat: isFloat,
          purchaseType: purchaseType || "both",
          tags: parsedTags,
        },
      }
    );
    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/shop2/products/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (product) {
      await deleteProductImageFromS3(product);
    }
    await productsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.patch("/api/shop2/products/:id/availability", checkMongoDB, checkAdmin, async (req, res) => {
  const { available } = req.body;
  if (typeof available !== 'boolean') {
      return res.status(400).json({ error: "Invalid available status" });
  }
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }
  try {
      await productsCollection2.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { available: available } }
      );
      res.json({ success: true });
  } catch (err) {
      console.error("Error updating shop2 availability:", err);
      res.status(500).json({ error: "Failed to update availability" });
  }
});

// ============ SHOP2 ADMIN ROUTES ============
app.post("/api/shop2/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  // 1. Search database users
  if (mongoConnected) {
    try {
      const user = await adminUsersCollection.findOne({ username: username.trim(), password: password.trim() });
      if (user) {
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.cookie("admin_shop2", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
        return res.json({ 
          success: true, 
          token: SESSION_TOKEN_SHOP2,
          role: user.role || "admin",
          name: user.name || user.username,
          shopAccess: user.shopAccess || "all"
        });
      }
    } catch (e) {
      console.error("Shop2 Login DB check error:", e);
    }
  }

  // 2. Fallback ENV check
  if (username.trim() === ADMIN_USER && password.trim() === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin_shop2", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
    return res.json({ success: true, token: SESSION_TOKEN_SHOP2, role: "admin", name: "المدير العام", shopAccess: "all" });
  }

  res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

// ============ USER MANAGEMENT APIs (ADMIN ONLY) ============
app.get("/api/admin/users", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const users = await adminUsersCollection.find({}, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/users", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, password, role, shopAccess } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: "الاسم وكلمة المرور مطلوبان" });
    }
    const cleanName = name.trim();
    const existing = await adminUsersCollection.findOne({ $or: [{ name: cleanName }, { username: cleanName }] });
    if (existing) {
      return res.status(400).json({ error: "هذا الاسم مستخدم بالفعل" });
    }
    const newUser = {
      name: cleanName,
      username: cleanName,
      password: password.trim(),
      role: role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: shopAccess || 'all',
      createdAt: new Date()
    };
    await adminUsersCollection.insertOne(newUser);
    delete newUser.password;
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/admin/users/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, shopAccess } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const cleanName = name ? name.trim() : '';
    const updateData = {
      name: cleanName,
      username: cleanName,
      role: role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: shopAccess || 'all'
    };
    if (password && password.trim().length > 0) {
      updateData.password = password.trim();
    }
    await adminUsersCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    res.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/api/admin/users/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    await adminUsersCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.get("/api/shop2/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

// ============ ADMIN ANALYTICS API ============
app.get("/api/admin/analytics", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  
  let ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  let prodColl = shop === "shop2" ? productsCollection2 : productsCollection;
  
  let startDate, endDate;
  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(req.query.startDate);
    endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date();
    const period = req.query.period || "30d";
    if (period === "7d") {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }
  }
  
  try {
    const matchStage = { createdAt: { $gte: startDate, $lte: endDate }, status: { $in: ["received", "completed"] } };
    
    // KPI Cards: Total Sales, Total Orders, Average Order Value (AOV), Active Customers
    const kpiSummary = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
          uniquePhones: { $addToSet: "$customerInfo.phone" }
      } }
    ]).toArray();
    
    const kpi = {
      totalRevenue: kpiSummary[0] ? kpiSummary[0].totalRevenue : 0,
      orderCount: kpiSummary[0] ? kpiSummary[0].orderCount : 0,
      avgOrderValue: kpiSummary[0] && kpiSummary[0].orderCount > 0 ? (kpiSummary[0].totalRevenue / kpiSummary[0].orderCount) : 0,
      activeCustomers: kpiSummary[0] ? kpiSummary[0].uniquePhones.length : 0
    };
    
    // Revenue trend (sales trend chart)
    const trend = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 }
      } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    const revenueTrend = trend.map(t => ({
      date: t._id,
      revenue: t.revenue,
      orders: t.orders
    }));
    
    // Price Mode split (bulk vs regular)
    const modes = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: "$priceMode",
          revenue: { $sum: "$totalPrice" },
          count: { $sum: 1 }
      } }
    ]).toArray();
    
    const priceModeSplit = {
      regular: { revenue: 0, count: 0 },
      bulk: { revenue: 0, count: 0 }
    };
    modes.forEach(m => {
      const key = m._id === "bulk" ? "bulk" : "regular";
      priceModeSplit[key] = { revenue: m.revenue, count: m.count };
    });
    
    // Fetch all products for this shop to evaluate real-time availability in-memory
    const allShopProducts = await prodColl.find({}).toArray();
    const isProductAvailable = (p) => {
      if (!p) return false;
      if (p.available === false || p.available === "false" || p.available === 0 || p.available === "0") {
        return false;
      }
      return true;
    };

    const availableProducts = allShopProducts.filter(p => isProductAvailable(p));
    const availableProductIdsStr = availableProducts.map(p => p._id.toString());

    // Top products by quantity sold (excluding currently unavailable products at call time)
    const topProductsRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantity: { $sum: { $toDouble: "$items.quantity" } },
          revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } }
      } },
      { $sort: { quantity: -1 } }
    ]).toArray();
    
    const topProductsFormatted = topProductsRaw
      .filter(p => p._id && availableProductIdsStr.includes(p._id.toString()))
      .slice(0, 10)
      .map(p => ({
        productId: p._id,
        name: p.name || "منتج مجهول",
        quantity: p.quantity,
        revenue: p.revenue
      }));
    
    // Top customers by spend
    const topCustomersRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $group: {
          _id: "$customerInfo.phone",
          name: { $first: "$customerInfo.name" },
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
      } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    const topCustomers = topCustomersRaw.map(c => ({
      phone: c._id,
      name: c.name || "عميل مجهول",
      totalSpent: c.totalSpent,
      orderCount: c.orderCount
    }));
    
    // Category Sales breakdown
    const categoriesRaw = await ordColl.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "prod"
      } },
      { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
      { $group: {
          _id: { $ifNull: ["$prod.category", "غير مصنف"] },
          revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } },
          count: { $sum: 1 }
      } },
      { $sort: { revenue: -1 } }
    ]).toArray();
    
    const categorySales = categoriesRaw.map(c => ({
      category: c._id,
      revenue: c.revenue,
      count: c.count
    }));
    
    // Top favorites count (excluding currently unavailable products at call time)
    const favCounts = await favoritesCollection.aggregate([
      { $match: { shop } },
      { $group: {
          _id: "$productId",
          count: { $sum: 1 }
      } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    const favProdMap = {};
    availableProducts.forEach(p => {
      favProdMap[p._id.toString()] = p.name;
    });
    
    const topFavorites = favCounts
      .filter(f => favProdMap[f._id.toString()])
      .slice(0, 10)
      .map(f => ({
        name: favProdMap[f._id.toString()],
        count: f.count
      }));

    // Actionable Insights: Inactive Customers (not active in selected period)
    const inactiveCustsRaw = await customersCollection.find({
      lastActive: { $lt: startDate }
    }).sort({ lastActive: -1 }).limit(10).toArray();
    const inactiveCustomers = inactiveCustsRaw.map(c => ({
      phone: c.phone,
      name: c.name || "عميل مجهول",
      lastActive: c.lastActive
    }));

    // Actionable Insights: Low Performing Products (currently AVAILABLE products with 0 sales in selected period)
    const soldProductIds = await ordColl.distinct("items.productId", matchStage);
    const soldProductIdsStr = soldProductIds.filter(id => id).map(id => id.toString());
    const lowPerformingProducts = availableProducts
      .filter(p => !soldProductIdsStr.includes(p._id.toString()))
      .slice(0, 10)
      .map(p => ({
        productId: p._id,
        name: p.name,
        category: p.category || "غير مصنف",
        price: p.price
      }));
    
    res.json({
      kpi,
      revenueTrend,
      priceModeSplit,
      topProducts: topProductsFormatted,
      topCustomers,
      categorySales,
      topFavorites,
      inactiveCustomers,
      lowPerformingProducts
    });
    
  } catch (err) {
    console.error("Aggregation analytics error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// ============ ADMIN REPORTS EXPORT API ============
app.get("/api/admin/reports/export", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const type = req.query.type || "orders"; // "orders" | "products" | "customers"
  
  let ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  
  let startDate, endDate;
  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(req.query.startDate);
    endDate = new Date(req.query.endDate);
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate = new Date();
    const period = req.query.period || "30d";
    if (period === "7d") {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0);
    }
  }
  
  const matchStage = { createdAt: { $gte: startDate, $lte: endDate }, status: { $in: ["received", "completed"] } };
  
  function escapeCSV(val) {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  try {
    if (type === "orders") {
      const orders = await ordColl.find(matchStage).sort({ createdAt: -1 }).toArray();
      let csv = "\uFEFF"; // UTF-8 BOM for Excel support
      csv += "رقم الطلب,التاريخ,اسم العميل,رقم الهاتف,طريقة التسعير,تاريخ التوصيل,الإجمالي,الحالة,المنتجات\n";
      orders.forEach(o => {
        const itemsSummary = o.items.map(item => `${item.name} (x${item.quantity})`).join(" | ");
        csv += `${escapeCSV(o._id)},${escapeCSV(o.createdAt.toISOString())},${escapeCSV(o.customerInfo.name)},${escapeCSV(o.customerInfo.phone)},${escapeCSV(o.priceMode)},${escapeCSV(o.deliveryDate)},${escapeCSV(o.totalPrice)},${escapeCSV(o.status)},${escapeCSV(itemsSummary)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="orders-report-${shop}.csv"`);
      return res.status(200).send(csv);
    } else if (type === "products") {
      const topProducts = await ordColl.aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        { $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            quantity: { $sum: { $toDouble: "$items.quantity" } },
            revenue: { $sum: { $multiply: [{ $toDouble: "$items.price" }, { $toDouble: "$items.quantity" }] } }
        } },
        { $sort: { quantity: -1 } }
      ]).toArray();
      
      let csv = "\uFEFF";
      csv += "معرف المنتج,اسم المنتج,الكمية المباعة,إجمالي الإيرادات\n";
      topProducts.forEach(p => {
        csv += `${escapeCSV(p._id)},${escapeCSV(p.name)},${escapeCSV(p.quantity)},${escapeCSV(p.revenue)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="products-report-${shop}.csv"`);
      return res.status(200).send(csv);
    } else if (type === "customers") {
      const topCustomersRaw = await ordColl.aggregate([
        { $match: matchStage },
        { $group: {
            _id: "$customerInfo.phone",
            name: { $first: "$customerInfo.name" },
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } },
        { $sort: { totalSpent: -1 } }
      ]).toArray();
      
      let csv = "\uFEFF";
      csv += "رقم الهاتف,اسم العميل,إجمالي الإنفاق,عدد الطلبات\n";
      topCustomersRaw.forEach(c => {
        csv += `${escapeCSV(c._id)},${escapeCSV(c.name)},${escapeCSV(c.totalSpent)},${escapeCSV(c.orderCount)}\n`;
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="customers-report-${shop}.csv"`);
      return res.status(200).send(csv);
    }
  } catch (err) {
    console.error("Export report error:", err);
    res.status(500).json({ error: "Failed to export report" });
  }
});

// ============ ADMIN ORDERS & CUSTOMERS APIs ============

// Get all orders for the admin panel
app.get("/api/admin/orders", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const status = req.query.status;
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    const query = {};
    if (status) {
      query.status = status;
    }
    const limitParam = req.query.limit;
    const limit = limitParam ? Math.min(Number(limitParam) || 1000, 5000) : 1000;
    const orders = await ordColl.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json(orders);
  } catch (err) {
    console.error("Fetch admin orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
app.put("/api/admin/orders/:id/status", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "ready", "received", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ success: true, status });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Full order edit
app.put("/api/admin/orders/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const { customerInfo, items, totalPrice, deliveryDate, notes, priceMode, status } = req.body;

    const updateDoc = {};
    if (customerInfo) {
      updateDoc.customerInfo = {
        name: (customerInfo.name || '').trim(),
        phone: (customerInfo.phone || '').trim()
      };
    }
    if (items && Array.isArray(items)) {
      updateDoc.items = items.map(item => ({
        productId: item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : item.productId,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      }));
      // Recalculate total price directly from items to guarantee mathematical correctness
      const calculatedTotal = updateDoc.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      updateDoc.totalPrice = Math.round(calculatedTotal * 100) / 100;
    } else if (totalPrice !== undefined) {
      updateDoc.totalPrice = Math.round(Number(totalPrice) * 100) / 100;
    }

    if (updateDoc.totalPrice !== undefined) {
      const existingOrder = await ordColl.findOne({ _id: new ObjectId(id) });
      if (existingOrder) {
        const paid = existingOrder.paidAmount || 0;
        if (paid >= updateDoc.totalPrice) {
          updateDoc.paymentStatus = 'paid';
          updateDoc.paidAmount = updateDoc.totalPrice; // Cap overpayment to match new total price
        } else if (paid > 0) {
          updateDoc.paymentStatus = 'partial';
        } else {
          updateDoc.paymentStatus = 'unpaid';
        }
      }
    }

    if (deliveryDate !== undefined) updateDoc.deliveryDate = deliveryDate;
    if (notes !== undefined) updateDoc.notes = notes;
    if (priceMode) updateDoc.priceMode = priceMode;
    if (status && ["pending", "ready", "received", "cancelled"].includes(status)) {
      updateDoc.status = status;
    }

    updateDoc.updatedAt = new Date();

    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Full order edit error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Get all customers with details
app.get("/api/admin/customers", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    const customers = await customersCollection.find().toArray();
    
    // Batch fetch all orders stats by phone
    const allOrderStats = await ordColl.aggregate([
      { $match: { status: { $in: ["received", "completed"] } } },
      { $group: {
          _id: "$customerInfo.phone",
          totalSpent: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
      } }
    ]).toArray();
    
    // Batch fetch outstanding balance stats by phone
    const unpaidStats = await ordColl.aggregate([
      { 
        $match: { 
          status: { $ne: "cancelled" },
          $or: [
            { paymentStatus: { $in: ["unpaid", "partial"] } },
            { paymentStatus: { $exists: false } }
          ]
        } 
      },
      { 
        $group: {
          _id: "$customerInfo.phone",
          totalOwed: { $sum: "$totalPrice" },
          totalPaid: { $sum: { $ifNull: ["$paidAmount", 0] } }
        } 
      }
    ]).toArray();

    // Batch fetch all favorites by phone for the active shop
    const allFavs = await favoritesCollection.find({ shop }).toArray();
    
    // Create lookup maps
    const statsMap = {};
    for (const stat of allOrderStats) {
      if (stat._id) statsMap[stat._id] = stat;
    }
    
    const balanceMap = {};
    for (const b of unpaidStats) {
      if (b._id) balanceMap[b._id] = Math.max(0, (b.totalOwed || 0) - (b.totalPaid || 0));
    }

    const favsMap = {};
    for (const fav of allFavs) {
      if (!favsMap[fav.phone]) favsMap[fav.phone] = [];
      favsMap[fav.phone].push(fav.productId.toString());
    }

    const customersWithDetails = customers.map(cust => {
      const phone = cust.phone;
      const stats = statsMap[phone] || { totalSpent: 0, orderCount: 0 };
      const outstandingBalance = balanceMap[phone] || 0;
      const favorites = favsMap[phone] || [];
      
      return {
        _id: cust._id,
        name: cust.name,
        phone,
        lastActive: cust.lastActive,
        createdAt: cust.createdAt,
        totalSpent: stats.totalSpent,
        orderCount: stats.orderCount,
        outstandingBalance,
        favorites
      };
    });

    res.json(customersWithDetails);
  } catch (err) {
    console.error("Fetch admin customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Update customer details (with reference linkage preservation)
app.put("/api/admin/customers/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const oldPhone = customer.phone;
    const newPhone = phone.trim();

    await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: name.trim(), phone: newPhone, lastActive: new Date() } }
    );

    if (oldPhone !== newPhone) {
      await favoritesCollection.updateMany({ phone: oldPhone }, { $set: { phone: newPhone } });
      await ordersCollection.updateMany({ "customerInfo.phone": oldPhone }, { $set: { "customerInfo.phone": newPhone } });
      await ordersCollection2.updateMany({ "customerInfo.phone": oldPhone }, { $set: { "customerInfo.phone": newPhone } });
      // Cascade phone change to payment audit trail
      await paymentsCollection.updateMany({ customerPhone: oldPhone }, { $set: { customerPhone: newPhone } });
    }

    res.json({ success: true, name, phone: newPhone });
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer and all their data (orders, favorites)
app.delete("/api/admin/customers/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const phone = customer.phone;

    // Wipe customer
    await customersCollection.deleteOne({ _id: new ObjectId(id) });

    // Wipe all related data
    if (phone) {
      await favoritesCollection.deleteMany({ phone });
      await ordersCollection.deleteMany({ "customerInfo.phone": phone });
      await ordersCollection2.deleteMany({ "customerInfo.phone": phone });
      await paymentsCollection.deleteMany({ customerPhone: phone });
    }

    res.json({ success: true, message: "Customer and all associated data deleted successfully." });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// ============ CUSTOMER PAYMENTS & BALANCES ============

// Get customer balance & unpaid orders
app.get("/api/admin/customers/:phone/balance", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { phone } = req.params;

  try {
    const unpaidOrders = await ordColl.find({
      "customerInfo.phone": phone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).sort({ createdAt: 1 }).toArray();

    // For legacy orders without paymentStatus, treat as unpaid
    const normalizedOrders = unpaidOrders.map(o => ({
      _id: o._id,
      totalPrice: o.totalPrice || 0,
      paidAmount: o.paidAmount || 0,
      remaining: (o.totalPrice || 0) - (o.paidAmount || 0),
      paymentStatus: o.paymentStatus || 'unpaid',
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      status: o.status,
      items: o.items
    }));

    const totalOwed = Math.round(normalizedOrders.reduce((sum, o) => sum + o.totalPrice, 0) * 100) / 100;
    const totalPaid = Math.round(normalizedOrders.reduce((sum, o) => sum + o.paidAmount, 0) * 100) / 100;
    const outstandingBalance = Math.round(Math.max(0, totalOwed - totalPaid) * 100) / 100;

    const recentPayments = await paymentsCollection.find({
      customerPhone: phone,
      shop
    }).sort({ createdAt: -1 }).limit(20).toArray();

    res.json({
      totalOwed,
      totalPaid,
      outstandingBalance,
      unpaidOrders: normalizedOrders,
      recentPayments
    });
  } catch (err) {
    console.error("Fetch customer balance error:", err);
    res.status(500).json({ error: "Failed to fetch customer balance" });
  }
});

// Record a payment (FIFO distribution)
app.post("/api/admin/payments", checkMongoDB, checkAdmin, async (req, res) => {
  const { customerPhone, customerName, amount, shop: reqShop, note, method, targetOrderId } = req.body;
  const shop = reqShop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  if (!customerPhone || typeof customerPhone !== 'string') {
    return res.status(400).json({ error: "Missing customer phone" });
  }
  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }
  if (method && !['cash', 'card', 'bank_transfer'].includes(method)) {
    return res.status(400).json({ error: "Invalid payment method" });
  }

  try {
    // Fetch unpaid/partial orders sorted oldest first (FIFO)
    let unpaidOrders = await ordColl.find({
      "customerInfo.phone": customerPhone.trim(),
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).sort({ createdAt: 1 }).toArray();

    // If targetOrderId is specified, move target order to the front of the allocation list
    if (targetOrderId && ObjectId.isValid(targetOrderId)) {
      const targetIdx = unpaidOrders.findIndex(o => o._id.toString() === targetOrderId.toString());
      if (targetIdx > 0) {
        const targetOrder = unpaidOrders.splice(targetIdx, 1)[0];
        unpaidOrders.unshift(targetOrder);
      }
    }

    // Prevent paying for cancelled orders
    const activeUnpaidOrders = unpaidOrders.filter(o => o.status !== 'cancelled');

    // Calculate total outstanding from active orders only
    const totalOutstanding = Math.round(activeUnpaidOrders.reduce((sum, o) => {
      return sum + ((o.totalPrice || 0) - (o.paidAmount || 0));
    }, 0) * 100) / 100;

    if (paymentAmount > totalOutstanding + 0.01) {
      return res.status(400).json({ 
        error: "Payment exceeds outstanding balance",
        outstanding: totalOutstanding
      });
    }

    if (activeUnpaidOrders.length === 0 && paymentAmount > 0) {
      return res.status(400).json({ error: "No active unpaid orders found for this customer" });
    }

    // FIFO distribution (only against active orders)
    let remaining = paymentAmount;
    const distributedTo = [];

    for (const order of activeUnpaidOrders) {
      if (remaining <= 0) break;

      const orderRemaining = (order.totalPrice || 0) - (order.paidAmount || 0);
      if (orderRemaining <= 0) continue;

      const applied = Math.round(Math.min(remaining, orderRemaining) * 100) / 100;
      const newPaidAmount = Math.round(((order.paidAmount || 0) + applied) * 100) / 100;
      const newStatus = (order.totalPrice - newPaidAmount) <= 0.009 ? 'paid' : 'partial';

      await ordColl.updateOne(
        { _id: order._id },
        { $set: { paidAmount: newPaidAmount, paymentStatus: newStatus, paymentMethod: method || 'cash' } }
      );

      distributedTo.push({
        orderId: order._id,
        applied: applied,
        orderTotal: order.totalPrice,
        previousPaid: order.paidAmount || 0,
        newPaidAmount: newPaidAmount,
        newStatus: newStatus
      });

      remaining = Math.round((remaining - applied) * 100) / 100;
    }

    const remainingBalanceAfter = Math.round(Math.max(0, totalOutstanding - paymentAmount) * 100) / 100;

    // Record payment transaction
    const paymentDoc = {
      customerPhone: customerPhone.trim(),
      customerName: (customerName || '').trim(),
      amount: paymentAmount,
      method: method || 'cash',
      shop,
      note: (note || '').trim(),
      distributedTo,
      remainingBalanceAfter: Math.max(0, remainingBalanceAfter),
      balanceBefore: totalOutstanding,
      createdAt: new Date()
    };

    const result = await paymentsCollection.insertOne(paymentDoc);

    res.status(201).json({
      success: true,
      paymentId: result.insertedId,
      amount: paymentAmount,
      distributedTo,
      remainingBalanceAfter: Math.max(0, remainingBalanceAfter)
    });
  } catch (err) {
    console.error("Record payment error:", err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// Get payment history for a customer
app.get("/api/admin/payments", checkMongoDB, checkAdmin, async (req, res) => {
  const { phone, shop: reqShop, limit: reqLimit } = req.query;
  const shop = reqShop === "shop2" ? "shop2" : "shop1";
  const limit = Math.min(Number(reqLimit) || 50, 200);

  try {
    const query = { shop };
    if (phone) query.customerPhone = phone;
    const payments = await paymentsCollection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json(payments);
  } catch (err) {
    console.error("Fetch payments error:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Get single payment receipt
app.get("/api/admin/payments/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(payment);
  } catch (err) {
    console.error("Fetch payment error:", err);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

// ============ REPORTS EXPORT APIs ============

// Export report as CSV
app.get("/api/admin/reports/export", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const type = req.query.type;
  const period = req.query.period;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    let dateFilter = {};
    if (period === 'custom') {
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          }
        };
      }
    } else {
      const now = new Date();
      let days = 30;
      if (period === '1d') days = 1;
      else if (period === '7d') days = 7;
      
      const cutoff = new Date(now.setDate(now.getDate() - days));
      dateFilter = { createdAt: { $gte: cutoff } };
    }

    let csvContent = "";
    let fileName = `report_${type}_${period}.csv`;

    if (type === "orders") {
      const list = await ordColl.find(dateFilter).sort({ createdAt: -1 }).toArray();
      const headers = ['رقم الطلب', 'التاريخ', 'اسم العميل', 'رقم الهاتف', 'الإجمالي (د.ل)', 'طريقة التسعير', 'الحالة', 'المنتجات المطلوبة'];
      const rows = list.map(o => [
        o._id.toString(),
        o.createdAt ? new Date(o.createdAt).toLocaleString('ar-LY') : '',
        o.customerInfo ? o.customerInfo.name : '',
        o.customerInfo ? o.customerInfo.phone : '',
        o.totalPrice || 0,
        o.priceMode === 'bulk' ? 'جملة' : 'مفرد',
        o.status === 'received' ? 'تم الاستلام' : o.status === 'completed' ? 'مكتمل' : o.status === 'ready' ? 'جاهز للاستلام' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار',
        o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(' | ') : ''
      ]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_الطلبات_${shop}_${period}.csv`;

    } else if (type === "products") {
      const completedOrders = await ordColl.find({ ...dateFilter, status: { $in: ['received', 'completed'] } }).toArray();
      const salesMap = {};
      for (const order of completedOrders) {
        if (!order.items) continue;
        for (const item of order.items) {
          const key = item.productId ? item.productId.toString() : item.name;
          if (!salesMap[key]) {
            salesMap[key] = {
              name: item.name,
              quantity: 0,
              revenue: 0
            };
          }
          salesMap[key].quantity += Number(item.quantity || 0);
          salesMap[key].revenue += Number(item.price || 0) * Number(item.quantity || 0);
        }
      }

      const prodColl = shop === "shop2" ? productsCollection2 : productsCollection;
      const allProducts = await prodColl.find().toArray();
      const headers = ['اسم المنتج', 'الفئة', 'الفئة الفرعية', 'سعر المفرد (د.ل)', 'سعر الجملة (د.ل)', 'الكمية المباعة', 'إجمالي الإيرادات (د.ل)'];
      const rows = [];
      for (const key in salesMap) {
        const sale = salesMap[key];
        const prodInfo = allProducts.find(p => p._id.toString() === key || p.name === sale.name);
        rows.push([
          sale.name,
          prodInfo ? prodInfo.category : 'غير معروف',
          prodInfo ? (prodInfo.subcategory || '') : '',
          prodInfo ? (prodInfo.price_regular || '') : '',
          prodInfo ? (prodInfo.price_bulk || '') : '',
          sale.quantity,
          sale.revenue.toFixed(2)
        ]);
      }
      rows.sort((a, b) => b[6] - a[6]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `أداء_المنتجات_${shop}_${period}.csv`;

    } else if (type === "customers") {
      const customers = await customersCollection.find().toArray();
      const headers = ['اسم العميل', 'رقم الهاتف', 'تاريخ التسجيل', 'آخر نشاط', 'عدد الطلبات الناجحة', 'إجمالي المشتريات (د.ل)', 'عدد المنتجات المفضلة'];

      // Batch fetch all orders stats by phone
      const allOrderStats = await ordColl.aggregate([
        { $match: { status: { $in: ["received", "completed"] }, ...dateFilter } },
        { $group: {
            _id: "$customerInfo.phone",
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } }
      ]).toArray();
      
      // Batch fetch all favorites by phone for the active shop
      const allFavsCount = await favoritesCollection.aggregate([
        { $match: { shop } },
        { $group: { _id: "$phone", count: { $sum: 1 } } }
      ]).toArray();
      
      const statsMap = {};
      for (const stat of allOrderStats) {
        if (stat._id) statsMap[stat._id] = stat;
      }
      
      const favsMap = {};
      for (const fav of allFavsCount) {
        if (fav._id) favsMap[fav._id] = fav.count;
      }

      const rows = customers.map(cust => {
        const phone = cust.phone;
        const stats = statsMap[phone] || { totalSpent: 0, orderCount: 0 };
        const favCount = favsMap[phone] || 0;

        return [
          cust.name || '',
          cust.phone || '',
          cust.createdAt ? new Date(cust.createdAt).toLocaleDateString('ar-LY') : '',
          cust.lastActive ? new Date(cust.lastActive).toLocaleString('ar-LY') : '',
          stats.orderCount,
          stats.totalSpent.toFixed(2),
          favCount
        ];
      });
      rows.sort((a, b) => b[5] - a[5]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_العملاء_${shop}_${period}.csv`;
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(csvContent);

  } catch (err) {
    console.error("Export report error:", err);
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
});

// Helper function to format CSV cleanly with Excel compatibility
function arrayToCSV(headers, rows) {
  const formatCell = val => {
    if (val === undefined || val === null) return '';
    let stringVal = String(val);
    if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
      stringVal = `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };
  
  const csvRows = [headers.map(formatCell).join(',')];
  for (const row of rows) {
    csvRows.push(row.map(formatCell).join(','));
  }
  return '\uFEFF' + csvRows.join('\r\n');
}

// ============ CUSTOMER & FAVORITES APIs ============

app.post("/api/customer/identify", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone || typeof name !== 'string' || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid name or phone number" });
    }
    
    const normalizedPhone = phone.trim();
    
    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: name.trim(), 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Identify customer error:", err);
    res.status(500).json({ error: "Failed to identify customer" });
  }
});

app.post("/api/customer/favorites", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone, shop, favorites } = req.body;
    if (!phone || !shop || !Array.isArray(favorites) || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }
    
    const normalizedPhone = phone.trim();
    
    // Clear existing favorites for this shop and phone
    await favoritesCollection.deleteMany({ phone: normalizedPhone, shop });
    
    // Insert new favorites
    if (favorites.length > 0) {
      const docs = favorites.map(id => ({
        phone: normalizedPhone,
        productId: new ObjectId(id),
        shop,
        createdAt: new Date()
      }));
      await favoritesCollection.insertMany(docs);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Sync favorites error:", err);
    res.status(500).json({ error: "Failed to sync favorites" });
  }
});

app.get("/api/customer/favorites", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const normalizedPhone = phone.trim();
    const favs = await favoritesCollection.find({ phone: normalizedPhone }).toArray();
    
    const shop1 = favs.filter(f => f.shop === 'shop1').map(f => f.productId.toString());
    const shop2 = favs.filter(f => f.shop === 'shop2').map(f => f.productId.toString());
    
    res.json({ shop1, shop2 });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.get("/api/customer/orders", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const normalizedPhone = phone.trim();
    
    // Query both databases/collections with limits
    const orders1 = await ordersCollection.find({ "customerInfo.phone": normalizedPhone }).sort({ createdAt: -1 }).limit(50).toArray();
    const orders2 = await ordersCollection2.find({ "customerInfo.phone": normalizedPhone }).sort({ createdAt: -1 }).limit(50).toArray();
    
    // Add shop tags
    const taggedOrders1 = orders1.map(o => ({ ...o, shop: 'shop1' }));
    const taggedOrders2 = orders2.map(o => ({ ...o, shop: 'shop2' }));
    
    // Combine and sort by date descending
    const allOrders = [...taggedOrders1, ...taggedOrders2].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(allOrders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});

// Customer confirms order received
app.put("/api/customer/orders/:id/received", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone" });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const order = await ordColl.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.customerInfo.phone !== phone.trim()) {
      return res.status(403).json({ error: "Phone mismatch" });
    }
    if (order.status !== 'ready') {
      return res.status(400).json({ error: "Order is not in ready state" });
    }

    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'received', receivedAt: new Date() } }
    );

    res.json({ success: true, status: 'received' });
  } catch (err) {
    console.error("Confirm order received error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ============ ORDER SUBMISSION APIs ============

app.post("/api/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryDate, notes, priceMode } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();

    // Upsert customer profile
    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: normalizedName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const orderDoc = {
      customerInfo: {
        name: normalizedName,
        phone: normalizedPhone
      },
      items: items.map(item => ({
        productId: ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      })),
      totalPrice: Math.round(Number(totalPrice) * 100) / 100,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: 'pending',
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(orderDoc);
    res.status(201).json({ success: true, orderId: result.insertedId });
  } catch (err) {
    console.error("Save order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.post("/api/shop2/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryDate, notes, priceMode } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();

    // Upsert customer profile
    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: normalizedName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const orderDoc = {
      customerInfo: {
        name: normalizedName,
        phone: normalizedPhone
      },
      items: items.map(item => ({
        productId: ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      })),
      totalPrice: Math.round(Number(totalPrice) * 100) / 100,
      paidAmount: 0,
      paymentStatus: 'unpaid',
      paymentMethod: 'cash',
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: 'pending',
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection2.insertOne(orderDoc);
    res.status(201).json({ success: true, orderId: result.insertedId });
  } catch (err) {
    console.error("Save shop2 order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// ============ CATCH-ALL ROUTE FOR VUE SPA ============
app.get("/app/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app", "index.html"));
});

// ============ FONT FILE HANDLER ============
// Handle requests for font files that may not exist (prevents 404 errors in console)
app.get("/*.ttf", (req, res) => {
  res.status(204).send(); // No Content - prevents console errors
});

app.get("/*.woff", (req, res) => {
  res.status(204).send();
});

app.get("/*.woff2", (req, res) => {
  res.status(204).send();
});

// ============ MARKETING CAROUSEL APIs ============

// Get carousel items (Public)
app.get("/api/marketing-carousel", checkMongoDB, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  try {
    const items = await carouselCollection.find({ shop }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    console.error("Get carousel error:", err);
    res.status(500).json({ error: "Failed to fetch marketing carousel" });
  }
});

// Get carousel items (Admin)
app.get("/api/admin/marketing-carousel", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  try {
    const items = await carouselCollection.find({ shop }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (err) {
    console.error("Get admin carousel error:", err);
    res.status(500).json({ error: "Failed to fetch carousel items" });
  }
});

// Add carousel item (Admin)
app.post("/api/admin/marketing-carousel", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { shop, title, subtitle, link } = req.body;
  if (!shop) {
    return res.status(400).json({ error: "Missing required shop field" });
  }
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}` });
  }
  
  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  let img = "/res/logo.jpg";
  if (req.file) {
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
    img = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
  }
  
  try {
    const newItem = {
      shop: shop === "shop2" ? "shop2" : "shop1",
      title: title || "",
      subtitle: subtitle || "",
      link: link || "",
      image: img,
      createdAt: new Date()
    };
    const result = await carouselCollection.insertOne(newItem);
    res.json({ success: true, item: { ...newItem, _id: result.insertedId } });
  } catch (err) {
    console.error("Add carousel item error:", err);
    res.status(500).json({ error: "Failed to create carousel item" });
  }
});

// Update carousel item (Admin)
app.put("/api/admin/marketing-carousel/:id", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, link } = req.body;
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}` });
  }

  try {
    const item = await carouselCollection.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: "Carousel item not found" });
    }

    const updateFields = {
      title: title || "",
      subtitle: subtitle || "",
      link: link || "",
    };

    if (req.file) {
      const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${req.file.key}`;
      updateFields.image = cloudfrontDomain ? `https://${cloudfrontDomain}/${req.file.key}` : s3Url;
    }

    await carouselCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    res.json({ success: true, item: { ...item, ...updateFields } });
  } catch (err) {
    console.error("Update carousel item error:", err);
    res.status(500).json({ error: "Failed to update carousel item" });
  }
});


// Delete carousel item (Admin)
app.delete("/api/admin/marketing-carousel/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await carouselCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete carousel item error:", err);
    res.status(500).json({ error: "Failed to delete carousel item" });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
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
    ordersCollection2.createIndex({ "customerInfo.phone": 1 });
    adminUsersCollection.createIndex({ username: 1 }, { unique: true });

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
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message, '- Retrying in 5s...');
    mongoConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
