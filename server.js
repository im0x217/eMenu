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
let mongoConnected = false;

// ============ MIDDLEWARE ============
const checkMongoDB = (req, res, next) => {
  if (!mongoConnected) {
    return res.status(503).json({ error: "Database not ready" });
  }
  next();
};

const checkAdmin = (req, res, next) => {
  // Accept either legacy admin cookie or the shop2-specific cookie for new admin2 panel
  const isAdmin = req.cookies.admin === "true" || req.cookies.admin_shop2 === "true";
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

  if (
    !name ||
    !category ||
    (parsedPriceRegular === null && parsedPrice === null)
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

  if (
    !updateData.name ||
    !updateData.category ||
    (updateData.price_regular === null && updateData.price === null)
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

  if (
    !name ||
    !category ||
    (parsedPriceRegular === null && parsedPrice === null)
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
