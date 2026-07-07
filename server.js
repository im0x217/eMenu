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
let db, productsCollection, categoriesCollection;
let db2, productsCollection2, categoriesCollection2;
let customersCollection, favoritesCollection, ordersCollection, ordersCollection2;
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
                  req.headers.authorization === "Bearer admin-token" ||
                  req.headers.authorization === "Bearer admin-token-shop2";
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
const loginLimiter = (() => {
  const ipCache = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 10; // Max 10 attempts per 15 minutes
    
    if (!ipCache.has(ip)) {
      ipCache.set(ip, []);
    }
    
    const timestamps = ipCache.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    ipCache.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
      console.log(`[RATE LIMIT EXCEEDED] IP: ${ip} exceeded login attempts limit.`);
      return res.status(429).json({ error: "Too many login attempts. Please try again after 15 minutes." });
    }
    next();
  };
})();

app.post("/api/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
    return res.json({ success: true, token: "admin-token" });
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
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
  
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
      purchaseType: purchaseType || 'both'
    });
    console.log("[UPLOAD SUCCESS] Product saved with image:", img);
    res.json({ success: true });
  } catch (err) {
    console.error("[UPLOAD ERROR] Database error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, existingImg } = req.body;
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  
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
      purchaseType: purchaseType || 'both'
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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }
    await categoriesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
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

app.get("/api/shop2/products", checkMongoDB, async (req, res) => {
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

app.post("/api/shop2/products", checkMongoDB, checkAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType } = req.body;
  
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
    const { name, desc, price_regular, price_bulk, category, subCategory, price, available, allowFloat, purchaseType, existingImg } = req.body;
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });

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
app.post("/api/shop2/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie("admin_shop2", "true", { httpOnly: true, sameSite: "Lax", secure: isSecure, path: "/" });
    return res.json({ success: true, token: "admin-token-shop2" });
  }
  res.status(401).json({ success: false, message: "Unauthorized" });
});

app.get("/api/shop2/admin-check", checkAdmin, (req, res) => {
  res.json({ ok: true });
});

// ============ ADMIN ANALYTICS API ============
app.get("/api/admin/analytics", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const period = req.query.period || "30d";
  
  let ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  let prodColl = shop === "shop2" ? productsCollection2 : productsCollection;
  
  let startDate;
      if (period === "7d") {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "30d") {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else {
    startDate = new Date(0);
  }
  
  try {
    const matchStage = { createdAt: { $gte: startDate }, status: "completed" };
    
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
    
    // Top products by quantity sold
    const topProducts = await ordColl.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
      } },
      { $sort: { quantity: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    const topProductsFormatted = topProducts.map(p => ({
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
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          count: { $sum: 1 }
      } },
      { $sort: { revenue: -1 } }
    ]).toArray();
    
    const categorySales = categoriesRaw.map(c => ({
      category: c._id,
      revenue: c.revenue,
      count: c.count
    }));
    
    // Top favorites count (in-memory resolution of names to avoid cross-db lookup issues)
    const favCounts = await favoritesCollection.aggregate([
      { $match: { shop } },
      { $group: {
          _id: "$productId",
          count: { $sum: 1 }
      } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();
    
    const favProductIds = favCounts.map(f => f._id);
    const favProducts = await prodColl.find({ _id: { $in: favProductIds } }).toArray();
    const favProdMap = {};
    favProducts.forEach(p => {
      favProdMap[p._id.toString()] = p.name;
    });
    
    const topFavorites = favCounts.map(f => ({
      name: favProdMap[f._id.toString()] || "منتج مجهول",
      count: f.count
    }));
    
    res.json({
      kpi,
      revenueTrend,
      priceModeSplit,
      topProducts: topProductsFormatted,
      topCustomers,
      categorySales,
      topFavorites
    });
    
  } catch (err) {
    console.error("Aggregation analytics error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
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
    const orders = await ordColl.find(query).sort({ createdAt: -1 }).limit(100).toArray();
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

  if (!["pending", "processing", "completed", "cancelled"].includes(status)) {
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

// Get all customers with details
app.get("/api/admin/customers", checkMongoDB, checkAdmin, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    const customers = await customersCollection.find().toArray();
    
    const customersWithDetails = await Promise.all(customers.map(async (cust) => {
      const phone = cust.phone;
      
      const orderStats = await ordColl.aggregate([
        { $match: { "customerInfo.phone": phone } },
        { $group: {
            _id: null,
            totalSpent: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 }
        } }
      ]).toArray();

      const favRecord = await favoritesCollection.findOne({ phone, shop });
      const favorites = favRecord ? favRecord.favorites : [];

      return {
        _id: cust._id,
        name: cust.name,
        phone: cust.phone,
        lastActive: cust.lastActive,
        createdAt: cust.createdAt,
        totalSpent: orderStats[0] ? orderStats[0].totalSpent : 0,
        orderCount: orderStats[0] ? orderStats[0].orderCount : 0,
        favorites
      };
    }));

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
    }

    res.json({ success: true, name, phone: newPhone });
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// ============ CUSTOMER & FAVORITES APIs ============

app.post("/api/customer/identify", checkMongoDB, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Missing name or phone number" });
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

app.post("/api/customer/favorites", checkMongoDB, async (req, res) => {
  try {
    const { phone, shop, favorites } = req.body;
    if (!phone || !shop || !Array.isArray(favorites)) {
      return res.status(400).json({ error: "Missing required fields" });
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

app.get("/api/customer/favorites", checkMongoDB, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: "Missing phone parameter" });
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

app.get("/api/customer/orders", checkMongoDB, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: "Missing phone parameter" });
    }
    
    const normalizedPhone = phone.trim();
    
    // Query both databases/collections
    const orders1 = await ordersCollection.find({ "customerInfo.phone": normalizedPhone }).toArray();
    const orders2 = await ordersCollection2.find({ "customerInfo.phone": normalizedPhone }).toArray();
    
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

// ============ ORDER SUBMISSION APIs ============

app.post("/api/orders", checkMongoDB, async (req, res) => {
  try {
    const { customer, items, totalPrice, deliveryDate, notes, priceMode } = req.body;
    if (!customer || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }
    
    const orderDoc = {
      customerInfo: {
        name: customer.name.trim(),
        phone: customer.phone.trim()
      },
      items: items.map(item => ({
        productId: new ObjectId(item.productId),
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      })),
      totalPrice: Number(totalPrice),
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
    
    const orderDoc = {
      customerInfo: {
        name: customer.name.trim(),
        phone: customer.phone.trim()
      },
      items: items.map(item => ({
        productId: new ObjectId(item.productId),
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        allowFloat: !!item.allowFloat,
        notes: item.notes || ''
      })),
      totalPrice: Number(totalPrice),
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
  customersCollection = db.collection("customers");
  favoritesCollection = db.collection("favorites");
  ordersCollection = db.collection("orders");
  ordersCollection2 = db2.collection("orders");
  mongoConnected = true;
  
  productsCollection.createIndex({ category: 1 });
  categoriesCollection.createIndex({ name: 1 }, { unique: true });
  productsCollection2.createIndex({ category: 1 });
  categoriesCollection2.createIndex({ name: 1 }, { unique: true });
  customersCollection.createIndex({ phone: 1 }, { unique: true });
  favoritesCollection.createIndex({ phone: 1, productId: 1, shop: 1 }, { unique: true });
  ordersCollection.createIndex({ "customerInfo.phone": 1 });
  ordersCollection2.createIndex({ "customerInfo.phone": 1 });

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
