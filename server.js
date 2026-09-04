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

// ============ PASSWORD & CUSTOMER AUTH HELPERS ============
function hashCustomerPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyCustomerPassword(password, storedHash, storedPlain) {
  if (storedPlain && String(storedPlain).trim() === String(password).trim()) return true;
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

function generateCustomerToken(phone) {
  const payload = `${phone}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'emenu-customer-secret-key-2026')
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

// Helper to look up customer by phone with flexible Libyan formatting (09..., 218..., +218...)
const findCustomerByPhone = async (phone) => {
  if (!phone) return null;
  const raw = phone.toString().trim();
  const digits = raw.replace(/[^0-9]/g, '');
  const variants = [raw];
  if (digits) {
    variants.push(digits);
    if (digits.startsWith('00218')) variants.push(digits.slice(2));
    if (digits.startsWith('218')) {
      variants.push('0' + digits.slice(3));
      variants.push(digits.slice(3));
      variants.push('+' + digits);
    } else if (digits.startsWith('0')) {
      variants.push('218' + digits.slice(1));
      variants.push('+218' + digits.slice(1));
      variants.push(digits.slice(1));
    } else if (digits.startsWith('9')) {
      variants.push('0' + digits);
      variants.push('218' + digits);
      variants.push('+218' + digits);
    }
  }
  const uniqueVariants = [...new Set(variants.filter(Boolean))];
  return await customersCollection.findOne({ phone: { $in: uniqueVariants } });
};


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
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.includes('assets')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

console.log("[INIT] Registering API routes...");

// ============ STATE ============
let db, productsCollection, categoriesCollection, tagsCollection;
let db2, productsCollection2, categoriesCollection2, tagsCollection2;
let customersCollection, favoritesCollection, ordersCollection, ordersCollection2, carouselCollection, adminUsersCollection, paymentsCollection, countersCollection;
let chefsCollection, chefsCollection2;
let backupsCollection;
let mongoConnected = false;

// Helper: Atomic Sequential Order Number Generator
const getNextOrderNumber = async () => {
  const result = await countersCollection.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.seq;
};

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

// ============ UNIVERSAL RECEIVING/EFFECTIVE DATE HELPER ============
const getOrderEffectiveDateStr = (order) => {
  if (!order) return '';
  if (order.deliveryDate) {
    if (typeof order.deliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(order.deliveryDate.trim())) {
      return order.deliveryDate.trim().slice(0, 10);
    }
    const d = new Date(order.deliveryDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA');
    }
  }
  if (order.receivedAt) {
    const d = new Date(order.receivedAt);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
  }
  if (order.createdAt) {
    const d = new Date(order.createdAt);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
  }
  return '';
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
          makingCost: 1,
          img: 1,
          category: 1,
          subCategory: 1,
          available: 1,
          cloudinary_public_id: 1,
          allowFloat: 1,
          purchaseType: 1,
          tags: 1,
          chefId: 1,
          chefName: 1,
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
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, tags, chefId, chefName } = req.body;
  
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
  const parsedMakingCost = Number(makingCost) || 0;

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
      makingCost: parsedMakingCost,
      img,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
    });
    console.log("[UPLOAD SUCCESS] Product saved with image:", img);
    res.json({ success: true });
  } catch (err) {
    console.error("[UPLOAD ERROR] Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags, chefId, chefName } = req.body;
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  const parsedMakingCost = Number(makingCost) || 0;
  
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
      makingCost: parsedMakingCost,
      category,
      subCategory,
      available: available === "false" ? false : true,
      allowFloat: isFloat,
      purchaseType: purchaseType || 'both',
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
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
          makingCost: 1,
          img: 1,
          category: 1,
          subCategory: 1,
          available: 1,
          cloudinary_public_id: 1,
          allowFloat: 1,
          purchaseType: 1,
          tags: 1,
          chefId: 1,
          chefName: 1,
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
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, tags, chefId, chefName } = req.body;
  
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
  const parsedMakingCost = Number(makingCost) || 0;

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
      makingCost: parsedMakingCost,
      img,
      category,
      subCategory,
      available: available !== "false",
      allowFloat: isFloat,
      purchaseType: purchaseType || "both",
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || ''
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
    const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, purchaseType, existingImg, tags, chefId, chefName } = req.body;
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
    const parsedMakingCost = Number(makingCost) || 0;

    await productsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          name,
          desc,
          price_regular: parsedPriceRegular,
          price_bulk: parsedPriceBulk,
          price: parsedPrice,
          makingCost: parsedMakingCost,
          img,
          category,
          subCategory,
          available: available !== "false",
          allowFloat: isFloat,
          purchaseType: purchaseType || "both",
          tags: parsedTags,
          chefId: chefId || '',
          chefName: chefName || '',
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
  
  let startDateStr = '', endDateStr = '';
  let startDateObj = null, endDateObj = null;

  if (req.query.startDate && req.query.endDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
    endDateStr = req.query.endDate.trim().slice(0, 10);
    startDateObj = new Date(req.query.startDate);
    endDateObj = new Date(req.query.endDate);
    endDateObj.setHours(23, 59, 59, 999);
  } else {
    const today = new Date();
    endDateStr = today.toLocaleDateString('en-CA');
    endDateObj = new Date();
    const period = req.query.period || "30d";
    if (period === "7d") {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      startDateStr = d.toLocaleDateString('en-CA');
      startDateObj = d;
    } else if (period === "30d") {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      startDateStr = d.toLocaleDateString('en-CA');
      startDateObj = d;
    } else if (period === "today" || period === "1d") {
      startDateStr = endDateStr;
      startDateObj = new Date();
      startDateObj.setHours(0, 0, 0, 0);
    } else {
      startDateStr = '1970-01-01';
      startDateObj = new Date(0);
    }
  }
  
  try {
    // Fetch all successful/received orders
    const allSuccessfulOrders = await ordColl.find({ status: { $in: ["received", "completed"] } }).toArray();

    // Filter orders by effective receiving date (rec_date)
    const filteredOrdersList = allSuccessfulOrders.filter(order => {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDateStr && endDateStr) {
        return effDate >= startDateStr && effDate <= endDateStr;
      } else if (startDateStr) {
        return effDate >= startDateStr;
      } else if (endDateStr) {
        return effDate <= endDateStr;
      }
      return true;
    });

    const matchingOrderIds = filteredOrdersList.map(o => o._id);
    const matchStage = { _id: { $in: matchingOrderIds } };
    
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
    
    // Revenue trend by effective receiving date (rec_date)
    const trendMap = {};
    for (const ord of filteredOrdersList) {
      const effDate = getOrderEffectiveDateStr(ord);
      if (!effDate) continue;
      if (!trendMap[effDate]) {
        trendMap[effDate] = { date: effDate, revenue: 0, orders: 0 };
      }
      trendMap[effDate].revenue += Number(ord.totalPrice) || 0;
      trendMap[effDate].orders += 1;
    }
    const revenueTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
    
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
    
    // Payment Methods breakdown (Actual paid values from paymentsCollection)
    const paymentMatchStage = { shop };
    if (startDateObj && endDateObj) {
      paymentMatchStage.createdAt = { $gte: startDateObj, $lte: endDateObj };
    }

    const paymentMethodsRaw = await paymentsCollection.aggregate([
      { $match: paymentMatchStage },
      { $group: {
          _id: "$method",
          revenue: { $sum: "$amount" },
          count: { $sum: 1 }
      } }
    ]).toArray();

    const paymentMethodsSplit = {
      cash: { revenue: 0, count: 0 },
      card: { revenue: 0, count: 0 },
      bank_transfer: { revenue: 0, count: 0 }
    };

    paymentMethodsRaw.forEach(pm => {
      const key = pm._id === 'card' ? 'card' : pm._id === 'bank_transfer' ? 'bank_transfer' : 'cash';
      paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + (pm.revenue || 0)) * 100) / 100;
      paymentMethodsSplit[key].count += (pm.count || 0);
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
    const inactiveFilterDate = (startDateObj && startDateObj.getTime() > 0) 
      ? startDateObj 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveCustsRaw = await customersCollection.find({
      $or: [
        { lastActive: { $lt: inactiveFilterDate } },
        { lastActive: { $exists: false } },
        { lastActive: null }
      ]
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
      paymentMethodsSplit,
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
    const updateOps = {
      $set: { status, updatedAt: new Date() }
    };
    if (status === 'cancelled') {
      updateOps.$set.cancelledAt = new Date();
    } else {
      updateOps.$unset = { cancelledAt: "" };
    }

    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      updateOps
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ 
      success: true, 
      status, 
      cancelledAt: status === 'cancelled' ? updateOps.$set.cancelledAt : null 
    });
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
    const unsetDoc = {};
    if (status && ["pending", "ready", "received", "cancelled"].includes(status)) {
      updateDoc.status = status;
      if (status === 'cancelled') {
        updateDoc.cancelledAt = new Date();
      } else {
        unsetDoc.cancelledAt = "";
      }
    }

    updateDoc.updatedAt = new Date();

    const updateQuery = { $set: updateDoc };
    if (Object.keys(unsetDoc).length > 0) {
      updateQuery.$unset = unsetDoc;
    }

    const result = await ordColl.updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If customer phone is provided/changed, ensure customer document exists/updated
    if (updateDoc.customerInfo && updateDoc.customerInfo.phone) {
      try {
        await customersCollection.updateOne(
          { phone: updateDoc.customerInfo.phone },
          { 
            $setOnInsert: { 
              name: updateDoc.customerInfo.name || 'عميل',
              phone: updateDoc.customerInfo.phone,
              createdAt: new Date()
            },
            $set: {
              lastActive: new Date()
            }
          },
          { upsert: true }
        );
      } catch (custErr) {
        console.warn("Failed to auto-upsert customer on order edit:", custErr);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Full order edit error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// Get all customers with details (Filtered accurately by rec_date / deliveryDate)
app.get("/api/admin/customers", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  let startDateStr = '';
  let endDateStr = '';
  if (req.query.selectedDate) {
    startDateStr = req.query.selectedDate.trim().slice(0, 10);
    endDateStr = startDateStr;
  } else if (req.query.startDate && req.query.endDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
    endDateStr = req.query.endDate.trim().slice(0, 10);
  } else if (req.query.startDate) {
    startDateStr = req.query.startDate.trim().slice(0, 10);
  } else if (req.query.endDate) {
    endDateStr = req.query.endDate.trim().slice(0, 10);
  }

  try {
    const customers = await customersCollection.find().toArray();
    
    // Fetch all non-cancelled orders for the active shop
    const allActiveOrders = await ordColl.find({ status: { $ne: "cancelled" } }).toArray();

    // Filter orders by effective receiving date (rec_date: deliveryDate -> receivedAt -> createdAt)
    const filteredOrders = allActiveOrders.filter(order => {
      if (!startDateStr && !endDateStr) return true;
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDateStr && endDateStr) {
        return effDate >= startDateStr && effDate <= endDateStr;
      } else if (startDateStr) {
        return effDate >= startDateStr;
      } else if (endDateStr) {
        return effDate <= endDateStr;
      }
      return true;
    });

    // Aggregate stats by customer phone
    const statsMap = {};
    const balanceMap = {};

    for (const order of filteredOrders) {
      const phone = order.customerInfo && order.customerInfo.phone;
      if (!phone) continue;

      if (!statsMap[phone]) {
        statsMap[phone] = { totalSpent: 0, orderCount: 0 };
      }
      statsMap[phone].totalSpent += Number(order.totalPrice) || 0;
      statsMap[phone].orderCount += 1;

      // Outstanding balance check
      const isUnpaidOrPartial = order.paymentStatus === 'unpaid' || order.paymentStatus === 'partial' || !order.paymentStatus;
      if (isUnpaidOrPartial) {
        const totalOwed = Number(order.totalPrice) || 0;
        const totalPaid = Number(order.paidAmount) || 0;
        const owed = Math.max(0, totalOwed - totalPaid);
        balanceMap[phone] = (balanceMap[phone] || 0) + owed;
      }
    }

    // Batch fetch all favorites by phone for the active shop
    const allFavs = await favoritesCollection.find({ shop }).toArray();
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
        password: cust.password || cust.plainPassword || '',
        hasPassword: !!(cust.password || cust.plainPassword || cust.passwordHash),
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

// Update customer details (with reference linkage preservation & password management)
app.put("/api/admin/customers/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, phone, password } = req.body;

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

    const updateDoc = { 
      name: name.trim(), 
      phone: newPhone, 
      lastActive: new Date() 
    };

    if (password !== undefined) {
      const cleanPass = String(password).trim();
      if (cleanPass.length > 0) {
        updateDoc.password = cleanPass;
        updateDoc.passwordHash = hashCustomerPassword(cleanPass);
      } else {
        updateDoc.password = '';
        updateDoc.passwordHash = '';
      }
    }

    await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
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


// Mark order as printed by admin
app.put("/api/admin/orders/:id/printed", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { printed: true, printedAt: new Date() } }
    );
    res.json({ success: true, printed: true });
  } catch (err) {
    console.error("Mark order printed error:", err);
    res.status(500).json({ error: "Failed to mark order as printed" });
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
      orderNumber: o.orderNumber || null,
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
        orderNumber: order.orderNumber || null,
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

// Admin endpoint to safely migrate unpaid orders paymentMethod to empty string
app.post("/api/admin/migrate-unpaid-orders", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const query = {
      $or: [
        { paymentStatus: 'unpaid' },
        { paymentStatus: { $exists: false } },
        { paidAmount: 0 },
        { paidAmount: { $exists: false } }
      ]
    };

    const res1 = await ordersCollection.updateMany(query, { $set: { paymentMethod: '' } });
    const res2 = await ordersCollection2.updateMany(query, { $set: { paymentMethod: '' } });

    res.json({
      success: true,
      shop1Modified: res1.modifiedCount,
      shop2Modified: res2.modifiedCount,
      message: `Migrated ${res1.modifiedCount + res2.modifiedCount} unpaid orders successfully.`
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Failed to migrate unpaid orders" });
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

// Cancel / Reverse a payment
app.post("/api/admin/payments/:id/cancel", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (payment.status === 'cancelled' || payment.isCancelled) {
      return res.status(400).json({ error: "هذه الدفعة ملغية بالفعل" });
    }

    const shop = payment.shop === "shop2" ? "shop2" : "shop1";
    const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

    // Reverse distribution for each affected order
    if (Array.isArray(payment.distributedTo)) {
      for (const dist of payment.distributedTo) {
        if (dist.orderId && ObjectId.isValid(dist.orderId)) {
          const order = await ordColl.findOne({ _id: new ObjectId(dist.orderId) });
          if (order) {
            const applied = Number(dist.applied) || 0;
            const newPaidAmount = Math.max(0, Math.round(((order.paidAmount || 0) - applied) * 100) / 100);
            let newStatus = 'unpaid';
            if (newPaidAmount >= (order.totalPrice || 0) - 0.009) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            const updateDoc = {
              paidAmount: newPaidAmount,
              paymentStatus: newStatus
            };
            if (newPaidAmount === 0) {
              updateDoc.paymentMethod = '';
            }
            await ordColl.updateOne(
              { _id: new ObjectId(dist.orderId) },
              { $set: updateDoc }
            );
          }
        }
      }
    }

    // Mark payment as cancelled in payments collection
    await paymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled', 
          isCancelled: true, 
          cancelledAt: new Date(), 
          cancelledBy: req.adminUser ? req.adminUser.username : 'admin' 
        } 
      }
    );

    res.json({
      success: true,
      message: "تم إلغاء واسترجاع الدفعة بنجاح",
      paymentId: id
    });
  } catch (err) {
    console.error("Cancel payment error:", err);
    res.status(500).json({ error: "فشل إلغاء الدفعة" });
  }
});

// Also support DELETE method for payment cancellation
app.delete("/api/admin/payments/:id", checkMongoDB, checkAdmin, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }

  try {
    const payment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (payment.status === 'cancelled' || payment.isCancelled) {
      return res.status(400).json({ error: "هذه الدفعة ملغية بالفعل" });
    }

    const shop = payment.shop === "shop2" ? "shop2" : "shop1";
    const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

    // Reverse distribution
    if (Array.isArray(payment.distributedTo)) {
      for (const dist of payment.distributedTo) {
        if (dist.orderId && ObjectId.isValid(dist.orderId)) {
          const order = await ordColl.findOne({ _id: new ObjectId(dist.orderId) });
          if (order) {
            const applied = Number(dist.applied) || 0;
            const newPaidAmount = Math.max(0, Math.round(((order.paidAmount || 0) - applied) * 100) / 100);
            let newStatus = 'unpaid';
            if (newPaidAmount >= (order.totalPrice || 0) - 0.009) {
              newStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newStatus = 'partial';
            }
            const updateDoc = {
              paidAmount: newPaidAmount,
              paymentStatus: newStatus
            };
            if (newPaidAmount === 0) {
              updateDoc.paymentMethod = '';
            }
            await ordColl.updateOne(
              { _id: new ObjectId(dist.orderId) },
              { $set: updateDoc }
            );
          }
        }
      }
    }

    await paymentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'cancelled', 
          isCancelled: true, 
          cancelledAt: new Date(), 
          cancelledBy: req.adminUser ? req.adminUser.username : 'admin' 
        } 
      }
    );

    res.json({
      success: true,
      message: "تم إلغاء واسترجاع الدفعة بنجاح",
      paymentId: id
    });
  } catch (err) {
    console.error("Delete payment error:", err);
    res.status(500).json({ error: "فشل إلغاء الدفعة" });
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

// ============ CUSTOMER AUTHENTICATION & PASSWORD APIs ============

// Register new customer account
app.post("/api/customer/register", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "يرجى كتابة الاسم بالكامل" });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
      return res.status(400).json({ error: "يرجى إدخال رقم هاتف صحيح" });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const normalizedPhone = phone.trim();
    const normalizedName = name.trim();

    // Check if phone already registered
    const existing = await customersCollection.findOne({ phone: normalizedPhone });
    if (existing) {
      if (existing.passwordHash) {
        return res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً، يرجى تسجيل الدخول بدلاً من ذلك" });
      } else {
        // Legacy customer without password: set password and activate account
        const passwordHash = hashCustomerPassword(password);
        await customersCollection.updateOne(
          { _id: existing._id },
          { 
            $set: { 
              name: existing.name || normalizedName,
              password: password.trim(),
              passwordHash,
              lastActive: new Date()
            } 
          }
        );
        const token = generateCustomerToken(normalizedPhone);
        return res.json({
          success: true,
          token,
          customer: {
            name: existing.name || normalizedName,
            phone: normalizedPhone,
            hasPassword: true
          }
        });
      }
    }

    // New customer registration
    const passwordHash = hashCustomerPassword(password);
    const newCustomerDoc = {
      name: normalizedName,
      phone: normalizedPhone,
      password: password.trim(),
      passwordHash,
      createdAt: new Date(),
      lastActive: new Date()
    };

    await customersCollection.insertOne(newCustomerDoc);
    const token = generateCustomerToken(normalizedPhone);

    res.status(201).json({
      success: true,
      token,
      customer: {
        name: normalizedName,
        phone: normalizedPhone,
        hasPassword: true
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "رقم الهاتف مسجل مسبقاً" });
    }
    console.error("Customer register error:", err);
    res.status(500).json({ error: "فشل إنشاء الحساب، يرجى المحاولة لاحقاً" });
  }
});

// Login to customer account
app.post("/api/customer/login", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: "يرجى إدخال رقم الهاتف" });
    }

    const normalizedPhone = phone.trim();
    const customer = await customersCollection.findOne({ phone: normalizedPhone });

    if (!customer) {
      return res.status(404).json({ error: "رقم الهاتف غير مسجل، يرجى إنشاء حساب جديد" });
    }

    // If customer has no password (legacy profile from guest ordering)
    if (!customer.passwordHash) {
      return res.json({
        success: true,
        requiresPasswordSetup: true,
        customer: {
          name: customer.name,
          phone: customer.phone,
          hasPassword: false
        }
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: "يرجى إدخال كلمة المرور" });
    }

    const isValid = verifyCustomerPassword(password, customer.passwordHash, customer.password);
    if (!isValid) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    await customersCollection.updateOne(
      { _id: customer._id },
      { $set: { lastActive: new Date() } }
    );

    const token = generateCustomerToken(normalizedPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: customer.phone,
        hasPassword: true
      }
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({ error: "فشل تسجيل الدخول" });
  }
});

// Set password for account (for legacy accounts or password updates)
app.post("/api/customer/set-password", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone, password, oldPassword } = req.body;
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const normalizedPhone = phone.trim();
    const customer = await customersCollection.findOne({ phone: normalizedPhone });

    if (!customer) {
      return res.status(404).json({ error: "الحساب غير موجود" });
    }

    // If already has password, verify old password first
    if ((customer.passwordHash || customer.password) && oldPassword) {
      const isOldValid = verifyCustomerPassword(oldPassword, customer.passwordHash, customer.password);
      if (!isOldValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
    }

    const newHash = hashCustomerPassword(password);
    await customersCollection.updateOne(
      { _id: customer._id },
      { 
        $set: { 
          password: password.trim(),
          passwordHash: newHash,
          lastActive: new Date()
        } 
      }
    );

    const token = generateCustomerToken(normalizedPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: customer.phone,
        hasPassword: true
      }
    });
  } catch (err) {
    console.error("Set customer password error:", err);
    res.status(500).json({ error: "فشل تعيين كلمة المرور" });
  }
});

// Get customer profile and password status
app.get("/api/customer/profile", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing phone parameter" });
    }
    const customer = await customersCollection.findOne({ phone: phone.trim() });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({
      name: customer.name,
      phone: customer.phone,
      hasPassword: !!customer.passwordHash,
      createdAt: customer.createdAt
    });
  } catch (err) {
    console.error("Get customer profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Admin reset customer password
app.put("/api/admin/customers/:id/reset-password", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب أن لا تقل عن 4 خانات" });
    }

    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const cleanNewPass = newPassword.trim();
    const passwordHash = hashCustomerPassword(cleanNewPass);
    await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { password: cleanNewPass, passwordHash, lastActive: new Date() } }
    );

    res.json({ success: true, password: cleanNewPass, message: "تم إعادة تعيين كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Admin reset customer password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


// Get customer balance for customer view (combines both shops)
app.get("/api/customer/balance", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing phone parameter" });
    }

    const normalizedPhone = phone.trim();

    // Query unpaid orders across both shops
    const unpaid1 = await ordersCollection.find({
      "customerInfo.phone": normalizedPhone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).toArray();

    const unpaid2 = await ordersCollection2.find({
      "customerInfo.phone": normalizedPhone,
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).toArray();

    const allUnpaid = [...unpaid1, ...unpaid2];
    const totalOwed = Math.round(allUnpaid.reduce((sum, o) => sum + (o.totalPrice || 0), 0) * 100) / 100;
    const totalPaid = Math.round(allUnpaid.reduce((sum, o) => sum + (o.paidAmount || 0), 0) * 100) / 100;
    const outstandingBalance = Math.round(Math.max(0, totalOwed - totalPaid) * 100) / 100;

    // Fetch all completed/received orders to get lifetime totals
    const allCompleted1 = await ordersCollection.find({ "customerInfo.phone": normalizedPhone, status: { $in: ["ready", "received", "completed"] } }).toArray();
    const allCompleted2 = await ordersCollection2.find({ "customerInfo.phone": normalizedPhone, status: { $in: ["ready", "received", "completed"] } }).toArray();
    const lifetimeTotal = Math.round([...allCompleted1, ...allCompleted2].reduce((sum, o) => sum + (o.totalPrice || 0), 0) * 100) / 100;

    res.json({
      outstandingBalance,
      unpaidOrdersCount: allUnpaid.length,
      lifetimeTotal,
      currency: "د.ل"
    });
  } catch (err) {
    console.error("Fetch customer balance error:", err);
    res.status(500).json({ error: "Failed to fetch customer balance" });
  }
});

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


// Customer edits their order (allowed ONLY if admin has not printed the order yet)
app.put("/api/customer/orders/:id", checkMongoDB, customerLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, shop, items, deliveryDate, notes } = req.body;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "رقم الهاتف مطلوب" });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الطلب غير صالح" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "يجب أن يحتوي الطلب على صنف واحد على الأقل" });
    }

    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const order = await ordColl.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    if (order.customerInfo?.phone !== phone.trim()) {
      return res.status(403).json({ error: "لا يمكنك تعديل هذا الطلب" });
    }

    // CRITICAL CHECK: Customer cannot edit if order has already been printed by admin!
    if (order.printed) {
      return res.status(403).json({ error: "تمت طباعة هذا الطلب في المحل ولا يمكن تعديله. يرجى التواصل مع الإدارة." });
    }

    if (['received', 'completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: "لا يمكن تعديل طلب مكتمل أو ملغي" });
    }

    // Calculate new total price
    let newTotal = 0;
    const updatedItems = items.map(item => {
      const qty = Math.max(0.1, Number(item.quantity) || 1);
      const price = Number(item.price) || 0;
      newTotal += price * qty;
      return {
        productId: ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
        name: item.name,
        price: price,
        quantity: item.allowFloat ? Math.round(qty * 10) / 10 : Math.round(qty),
        allowFloat: !!item.allowFloat,
        notes: (item.notes || '').trim()
      };
    });

    newTotal = Math.round(newTotal * 100) / 100;

    const paidAmount = order.paidAmount || 0;
    const newPaymentStatus = paidAmount >= newTotal && newTotal > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          items: updatedItems,
          totalPrice: newTotal,
          deliveryDate: deliveryDate !== undefined ? deliveryDate : order.deliveryDate,
          notes: notes !== undefined ? notes : order.notes,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date()
        }
      }
    );

    const updatedOrder = await ordColl.findOne({ _id: new ObjectId(id) });
    res.json({ success: true, order: { ...updatedOrder, shop } });
  } catch (err) {
    console.error("Customer edit order error:", err);
    res.status(500).json({ error: "فشل تعديل الطلب" });
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

// Helper function to check if two order item lists are identical
const areOrderItemsEqual = (itemsA, itemsB) => {
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB)) return false;
  if (itemsA.length !== itemsB.length) return false;
  
  const sortKey = item => `${item.productId || ''}_${(item.name || '').trim().toLowerCase()}_${Number(item.price)}_${Number(item.quantity)}`;
  const sortedA = [...itemsA].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const sortedB = [...itemsB].sort((a, b) => sortKey(b).localeCompare(sortKey(b)));
  
  for (let i = 0; i < sortedA.length; i++) {
    const a = sortedA[i];
    const b = sortedB[i];
    const nameMatch = (a.name || '').trim().toLowerCase() === (b.name || '').trim().toLowerCase();
    const qtyMatch = Number(a.quantity) === Number(b.quantity);
    const priceMatch = Math.abs((Number(a.price) || 0) - (Number(b.price) || 0)) < 0.05;
    if (!nameMatch || !qtyMatch || !priceMatch) {
      return false;
    }
  }
  return true;
};

// ============ ORDER SUBMISSION APIs ============

app.post("/api/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryDate, notes, priceMode, status, paidAmount, paymentStatus, paymentMethod, force, bypassDuplicateCheck } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();
    const parsedTotal = Math.round(Number(totalPrice) * 100) / 100;

    // 5-Minute Duplicate Order Prevention (Cooldown)
    if (!force && !bypassDuplicateCheck) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection.find({
        "customerInfo.phone": normalizedPhone,
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(items, recent.items)) {
          const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
          const remainingSeconds = Math.max(1, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000));
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          const existingNum = recent.orderNumber || (recent._id ? recent._id.toString().slice(-6) : '');
          
          return res.status(409).json({
            error: `تم إرسال نفس هذا الطلب بالفعل برقم #${existingNum} منذ ${Math.round(elapsedMs / 60000) || 1} دقيقة. يرجى الانتظار ${remainingMinutes} دقيقة لتجنب التكرار.`,
            isDuplicate: true,
            existingOrderNumber: existingNum,
            existingOrderId: recent._id,
            remainingSeconds,
            remainingMinutes
          });
        }
      }
    }

    // Upsert customer profile (preserve registered name)
    const existingCust = await customersCollection.findOne({ phone: normalizedPhone });
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: finalCustName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const parsedPaid = Number(paidAmount) || 0;
    const parsedPaymentStatus = paymentStatus || (parsedPaid >= parsedTotal && parsedTotal > 0 ? 'paid' : (parsedPaid > 0 ? 'partial' : 'unpaid'));

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
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
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: paymentMethod || '',
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: (status && ['pending', 'ready', 'received', 'cancelled'].includes(status)) ? status : 'pending',
      ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(orderDoc);
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    console.error("Save order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.post("/api/shop2/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryDate, notes, priceMode, status, paidAmount, paymentStatus, paymentMethod, force, bypassDuplicateCheck } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const normalizedPhone = customer.phone.trim();
    const normalizedName = customer.name.trim();
    const parsedTotal = Math.round(Number(totalPrice) * 100) / 100;

    // 5-Minute Duplicate Order Prevention (Cooldown)
    if (!force && !bypassDuplicateCheck) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection2.find({
        "customerInfo.phone": normalizedPhone,
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(items, recent.items)) {
          const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
          const remainingSeconds = Math.max(1, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000));
          const remainingMinutes = Math.ceil(remainingSeconds / 60);
          const existingNum = recent.orderNumber || (recent._id ? recent._id.toString().slice(-6) : '');
          
          return res.status(409).json({
            error: `تم إرسال نفس هذا الطلب بالفعل برقم #${existingNum} منذ ${Math.round(elapsedMs / 60000) || 1} دقيقة. يرجى الانتظار ${remainingMinutes} دقيقة لتجنب التكرار.`,
            isDuplicate: true,
            existingOrderNumber: existingNum,
            existingOrderId: recent._id,
            remainingSeconds,
            remainingMinutes
          });
        }
      }
    }

    // Upsert customer profile (preserve registered name)
    const existingCust = await customersCollection.findOne({ phone: normalizedPhone });
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    await customersCollection.updateOne(
      { phone: normalizedPhone },
      { 
        $set: { 
          name: finalCustName, 
          lastActive: new Date() 
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    const parsedPaid = Number(paidAmount) || 0;
    const parsedPaymentStatus = paymentStatus || (parsedPaid >= parsedTotal && parsedTotal > 0 ? 'paid' : (parsedPaid > 0 ? 'partial' : 'unpaid'));

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
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
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: paymentMethod || '',
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: (status && ['pending', 'ready', 'received', 'cancelled'].includes(status)) ? status : 'pending',
      ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection2.insertOne(orderDoc);
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    console.error("Save shop2 order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// ============ FAVICON & ICON ROUTES ============
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.ico"));
});

app.get("/favicon.svg", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.sendFile(path.join(__dirname, "public", "favicon.svg"));
});

app.get("/apple-touch-icon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon.png"));
});

app.get("/manifest-admin.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest-admin.json"));
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

// ============ CHEF MANAGEMENT & PRODUCTION REPORT ============

// Get all chefs for active shop
app.get("/api/admin/chefs", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const shop = req.query.shop || 'shop1';
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const chefs = await chefColl.find().sort({ name: 1 }).toArray();
    res.json(chefs);
  } catch (err) {
    console.error("Fetch chefs error:", err);
    res.status(500).json({ error: "Failed to fetch chefs" });
  }
});

// Create a new chef
app.post("/api/admin/chefs", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, phone, shop } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "اسم الشيف مطلوب" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const newChef = {
      name: name.trim(),
      phone: (phone || '').trim(),
      active: true,
      createdAt: new Date(),
      lastActive: new Date()
    };
    const result = await chefColl.insertOne(newChef);
    res.status(201).json({ success: true, _id: result.insertedId, ...newChef });
  } catch (err) {
    console.error("Create chef error:", err);
    res.status(500).json({ error: "Failed to create chef" });
  }
});

// Update chef details
app.put("/api/admin/chefs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, active, shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: "اسم الشيف مطلوب" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    const oldChef = await chefColl.findOne({ _id: new ObjectId(id) });
    const newName = name.trim();
    
    await chefColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { name: newName, phone: (phone || '').trim(), active: active !== false, lastActive: new Date() } }
    );
    
    // If name changed, cascade update to all assigned products
    if (oldChef && oldChef.name !== newName) {
      await prodColl.updateMany(
        { chefId: id },
        { $set: { chefName: newName } }
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Update chef error:", err);
    res.status(500).json({ error: "Failed to update chef" });
  }
});

// Delete chef (and unlink products)
app.delete("/api/admin/chefs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const shop = req.query.shop || 'shop1';
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    await chefColl.deleteOne({ _id: new ObjectId(id) });
    // Unlink all products from this chef
    await prodColl.updateMany(
      { chefId: id },
      { $set: { chefId: '', chefName: '' } }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Delete chef error:", err);
    res.status(500).json({ error: "Failed to delete chef" });
  }
});

// Bulk assign products to a chef (robust ObjectId and string matching)
app.put("/api/admin/chefs/:id/assign-products", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds, shop } = req.body;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chef ID" });
    }
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: "productIds must be an array" });
    }
    const chefColl = shop === 'shop2' ? chefsCollection2 : chefsCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    const chef = await chefColl.findOne({ _id: new ObjectId(id) });
    if (!chef) {
      return res.status(404).json({ error: "Chef not found" });
    }

    const chefIdStr = String(id);
    const validObjectIds = productIds.filter(pid => ObjectId.isValid(pid)).map(pid => new ObjectId(pid));
    
    // 1. Unassign all products currently assigned to this chef that are NOT in the new selection
    await prodColl.updateMany(
      { 
        $or: [{ chefId: chefIdStr }, { chefId: new ObjectId(id) }],
        _id: { $nin: validObjectIds } 
      },
      { $set: { chefId: '', chefName: '' } }
    );
    
    // 2. Assign the specified products to this chef
    if (validObjectIds.length > 0) {
      await prodColl.updateMany(
        { _id: { $in: validObjectIds } },
        { $set: { chefId: chefIdStr, chefName: chef.name } }
      );
    }
    
    res.json({ success: true, assignedCount: validObjectIds.length });
  } catch (err) {
    console.error("Assign products to chef error:", err);
    res.status(500).json({ error: "Failed to assign products" });
  }
});

// Production report: aggregate order items by chef via product→chef mapping
app.get("/api/admin/production/report", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { shop, startDate, endDate, chefId } = req.query;
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;
    const prodColl = shop === 'shop2' ? productsCollection2 : productsCollection;
    
    // Uses universal getOrderEffectiveDateStr(order) helper

    // Get all non-cancelled orders
    const allOrders = await ordColl.find({
      status: { $ne: "cancelled" }
    }).toArray();

    // Filter orders accurately by effective date range (time-zone immune YYYY-MM-DD comparison)
    const orders = allOrders.filter(order => {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDate && endDate) {
        return effDate >= startDate && effDate <= endDate;
      } else if (startDate) {
        return effDate >= startDate;
      } else if (endDate) {
        return effDate <= endDate;
      }
      return true;
    });
    
    // Get all products with chef assignments
    const allProducts = await prodColl.find().toArray();
    const productMap = {};
    for (const p of allProducts) {
      productMap[p._id.toString()] = {
        name: p.name,
        category: p.category || '',
        chefId: p.chefId || '',
        chefName: p.chefName || '',
        makingCost: p.makingCost || 0,
        price_regular: p.price_regular || p.price || 0
      };
    };
    
    // Aggregate: for each order item, map to its chef via product
    const chefAgg = {};  // chefId -> { name, products: { productId -> { name, qty, revenue, cost } } }
    const unassignedProducts = {}; // productId -> { name, qty, revenue }
    
    for (const order of orders) {
      const items = order.items || [];
      for (const item of items) {
        const pid = (item.productId || item._id || '').toString();
        const pInfo = productMap[pid];
        const qty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;
        const revenue = itemPrice * qty;
        
        if (pInfo && pInfo.chefId) {
          // Filter by chefId if specified
          if (chefId && pInfo.chefId !== chefId) continue;
          
          if (!chefAgg[pInfo.chefId]) {
            chefAgg[pInfo.chefId] = {
              chefId: pInfo.chefId,
              chefName: pInfo.chefName,
              totalQty: 0,
              totalRevenue: 0,
              totalCost: 0,
              products: {}
            };
          }
          const chef = chefAgg[pInfo.chefId];
          chef.totalQty += qty;
          chef.totalRevenue += revenue;
          chef.totalCost += (pInfo.makingCost || 0) * qty;
          
          if (!chef.products[pid]) {
            chef.products[pid] = { name: pInfo.name, category: pInfo.category, qty: 0, revenue: 0, cost: 0 };
          }
          chef.products[pid].qty += qty;
          chef.products[pid].revenue += revenue;
          chef.products[pid].cost += (pInfo.makingCost || 0) * qty;
        } else if (!chefId) {
          // Unassigned product
          const pName = pInfo ? pInfo.name : (item.name || 'منتج غير معروف');
          if (!unassignedProducts[pid]) {
            unassignedProducts[pid] = { name: pName, qty: 0, revenue: 0 };
          }
          unassignedProducts[pid].qty += qty;
          unassignedProducts[pid].revenue += revenue;
        }
      }
    }
    
    // Convert to arrays for response
    const chefReport = Object.values(chefAgg).map(c => ({
      ...c,
      products: Object.values(c.products).sort((a, b) => b.qty - a.qty)
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    const unassigned = Object.values(unassignedProducts).sort((a, b) => b.qty - a.qty);
    
    const grandTotalQty = chefReport.reduce((s, c) => s + c.totalQty, 0) + unassigned.reduce((s, p) => s + p.qty, 0);
    const grandTotalRevenue = chefReport.reduce((s, c) => s + c.totalRevenue, 0) + unassigned.reduce((s, p) => s + p.revenue, 0);
    const grandTotalCost = chefReport.reduce((s, c) => s + c.totalCost, 0);
    
    res.json({
      chefReport,
      unassigned,
      totalOrders: orders.length,
      grandTotalQty,
      grandTotalRevenue: Math.round(grandTotalRevenue * 100) / 100,
      grandTotalCost: Math.round(grandTotalCost * 100) / 100
    });
  } catch (err) {
    console.error("Production report error:", err);
    res.status(500).json({ error: "Failed to generate production report" });
  }
});

// Production report: get all customer orders containing a specific product within the date range
app.get("/api/admin/production/product-orders", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { shop, productName, productId, startDate, endDate } = req.query;
    if (!productName && !productId) {
      return res.status(400).json({ error: "Product name or ID is required" });
    }
    const ordColl = shop === 'shop2' ? ordersCollection2 : ordersCollection;

    // Get all non-cancelled orders
    const allOrders = await ordColl.find({
      status: { $ne: "cancelled" }
    }).sort({ createdAt: -1 }).toArray();

    // Filter orders accurately by effective date range (time-zone immune YYYY-MM-DD comparison)
    const orders = allOrders.filter(order => {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) return false;
      if (startDate && endDate) {
        return effDate >= startDate && effDate <= endDate;
      } else if (startDate) {
        return effDate >= startDate;
      } else if (endDate) {
        return effDate <= endDate;
      }
      return true;
    });

    const targetName = productName ? productName.trim().toLowerCase() : '';
    const targetId = productId ? productId.toString().trim() : '';

    const orderResults = [];
    for (const order of orders) {
      const items = order.items || [];
      // Match by productId or productName
      const matchingItems = items.filter(item => {
        const itemPid = (item.productId || item._id || '').toString().trim();
        const itemName = (item.name || '').trim().toLowerCase();
        if (targetId && itemPid && itemPid === targetId) return true;
        if (targetName && itemName && itemName === targetName) return true;
        return false;
      });

      if (matchingItems.length > 0) {
        const productTotalQty = matchingItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
        const productTotalPrice = matchingItems.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);
        const notesList = matchingItems.map(it => it.notes).filter(Boolean);

        orderResults.push({
          orderId: order._id,
          orderNumber: order.orderNumber || (order._id ? order._id.toString().slice(-6) : ''),
          customerName: order.customerInfo?.name || 'عميل نقدي',
          customerPhone: order.customerInfo?.phone || '',
          orderDate: order.createdAt,
          deliveryDate: order.deliveryDate || '',
          effectiveDate: getOrderEffectiveDateStr(order),
          status: order.status || 'pending',
          paymentStatus: order.paymentStatus || 'unpaid',
          priceMode: order.priceMode || 'retail',
          quantity: productTotalQty,
          totalPrice: Math.round(productTotalPrice * 100) / 100,
          unitPrice: matchingItems[0]?.price || 0,
          notes: notesList.join(' ، ')
        });
      }
    }

    // Group by customer for aggregated customer-level view
    const customerMap = {};
    for (const ord of orderResults) {
      const custKey = (ord.customerPhone ? ord.customerPhone.trim() : ord.customerName.trim());
      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          totalQty: 0,
          totalAmount: 0,
          ordersCount: 0,
          orders: []
        };
      }
      customerMap[custKey].totalQty += ord.quantity;
      customerMap[custKey].totalAmount = Math.round((customerMap[custKey].totalAmount + ord.totalPrice) * 100) / 100;
      customerMap[custKey].ordersCount += 1;
      customerMap[custKey].orders.push(ord);
    }

    const customers = Object.values(customerMap).sort((a, b) => b.totalQty - a.totalQty);
    const totalQty = orderResults.reduce((sum, o) => sum + o.quantity, 0);
    const totalRevenue = Math.round(orderResults.reduce((sum, o) => sum + o.totalPrice, 0) * 100) / 100;

    res.json({
      productName: productName || (orderResults[0] ? orderResults[0].productName : ''),
      totalQty,
      totalRevenue,
      ordersCount: orderResults.length,
      customersCount: customers.length,
      orders: orderResults,
      customers
    });
  } catch (err) {
    console.error("Product orders error:", err);
    res.status(500).json({ error: "Failed to fetch product customer orders" });
  }
});

// ============ BACKUP & DATA MANAGEMENT ============

// Create a full backup of all collections
app.post("/api/admin/backup", checkMongoDB, checkAdmin, async (req, res) => {
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
app.get("/api/admin/backups", checkMongoDB, checkAdmin, async (req, res) => {
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
app.get("/api/admin/backup/:id/download", checkMongoDB, checkAdmin, async (req, res) => {
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
app.delete("/api/admin/backup/:id", checkMongoDB, checkAdmin, async (req, res) => {
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
app.post("/api/admin/reset/orders", checkMongoDB, checkAdmin, async (req, res) => {
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
    ordersCollection.createIndex({ cancelledAt: 1 }, { expireAfterSeconds: 86400 });
    ordersCollection2.createIndex({ "customerInfo.phone": 1 });
    ordersCollection2.createIndex({ orderNumber: 1 });
    ordersCollection2.createIndex({ cancelledAt: 1 }, { expireAfterSeconds: 86400 });
    adminUsersCollection.createIndex({ username: 1 }, { unique: true });
    chefsCollection.createIndex({ name: 1 });
    chefsCollection2.createIndex({ name: 1 });

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
app.post("/api/admin/orders/cleanup-cancelled", checkMongoDB, checkAdmin, async (req, res) => {
  const result = await cleanupExpiredCancelledOrders();
  res.json(result);
});

connectWithRetry();

// Schedule periodic cleanup of cancelled orders every 30 minutes
setInterval(cleanupExpiredCancelledOrders, 30 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
