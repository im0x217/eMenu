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

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'emenu-admin-secret-key-2026';

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
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyCustomerToken(token, expectedPhone) {
  if (!token || typeof token !== 'string') return false;
  try {
    const cleanToken = token.trim();
    const decoded = Buffer.from(cleanToken, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 4) return false;
    const [tokenPhone, timestamp, rand, signature] = parts;
    const payload = `${tokenPhone}:${timestamp}:${rand}`;
    const expectedSig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET)
      .update(payload)
      .digest('hex');
    if (signature !== expectedSig) return false;

    if (expectedPhone) {
      const cleanExpected = expectedPhone.toString().replace(/[^0-9]/g, '');
      const cleanTokenPhone = tokenPhone.replace(/[^0-9]/g, '');
      if (cleanExpected.slice(-9) !== cleanTokenPhone.slice(-9)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
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
app.use(cookieParser(ADMIN_SESSION_SECRET));
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json') || filePath.endsWith('manifest-admin.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.includes('assets') || filePath.match(/\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|svg|woff2?)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
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
let telemetryCollection;
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

const isStaffSession = (req) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const signedToken = req.signedCookies?.admin_session || req.signedCookies?.admin_session_shop2;
  const token = bearerToken || signedToken;
  return !!(token && (token === SESSION_TOKEN_SHOP1 || token === SESSION_TOKEN_SHOP2));
};

const checkAdmin = (req, res, next) => {
  if (isStaffSession(req)) return next();
  res.status(403).json({ success: false, message: "Forbidden" });
};

const checkCustomerAuth = (req, res, next) => {
  // 1. Authenticated staff/admin sessions have operational access to customer records
  if (isStaffSession(req)) return next();

  // 2. Validate customer token against target phone
  const phone = req.query.phone || req.body?.phone;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const customerToken = req.headers['x-customer-token'] || bearerToken;

  if (verifyCustomerToken(customerToken, phone)) {
    return next();
  }
  return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول للوصول إلى بيانات الطلبات" });
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


// ============ ROUTERS ============
const createAuthRouter = require('./routes/auth');
const createProductsRouter = require('./routes/products');
const createMarketingRouter = require('./routes/marketing');
const createOrdersRouter = require('./routes/orders');
const createCustomersRouter = require('./routes/customers');
const createAnalyticsRouter = require('./routes/analytics');
const createBackupsRouter = require('./routes/backups');


// Context object with getters for variables that change after DB connection
const routerContext = {
  get mongoConnected() { return mongoConnected; },
  get adminUsersCollection() { return adminUsersCollection; },
  get productsCollection() { return productsCollection; },
  get categoriesCollection() { return categoriesCollection; },
  get tagsCollection() { return tagsCollection; },
  get productsCollection2() { return productsCollection2; },
  get categoriesCollection2() { return categoriesCollection2; },
  get tagsCollection2() { return tagsCollection2; },
  get carouselCollection() { return carouselCollection; },
  get chefsCollection() { return chefsCollection; },
  get ordersCollection() { return ordersCollection; },
  get ordersCollection2() { return ordersCollection2; },
  get customersCollection() { return customersCollection; },
  get paymentsCollection() { return paymentsCollection; },
  get countersCollection() { return countersCollection; },
  get telemetryCollection() { return telemetryCollection; },
  get backupsCollection() { return backupsCollection; },
  get chefsCollection2() { return chefsCollection2; },
  getNextOrderNumber, findCustomerByPhone,
  customerLimiter, checkCustomerAuth,
  MONGO_URI, getOrderEffectiveDateStr, generateCustomerToken,

  
  // Constants and functions
  SESSION_TOKEN_SHOP1, SESSION_TOKEN_SHOP2, ADMIN_USER, ADMIN_PASS,
  verifyCustomerPassword, hashCustomerPassword,
  loginLimiter, checkAdmin, checkMongoDB,
  upload, uploadErrorHandler, parsePrice, getDisplayImage, deleteProductImageFromS3, attachS3Images
};

app.use(createAuthRouter(routerContext));
app.use(createProductsRouter(routerContext));
app.use(createMarketingRouter(routerContext));
app.use(createOrdersRouter(routerContext));
app.use(createCustomersRouter(routerContext));
app.use(createAnalyticsRouter(routerContext));
app.use(createBackupsRouter(routerContext));


  // Products Routes moved
  // Auth Routes 2 moved
  // Auth Routes 3 moved
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

connectWithRetry();

// Schedule periodic cleanup of cancelled orders every 30 minutes
setInterval(cleanupExpiredCancelledOrders, 30 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
