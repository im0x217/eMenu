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
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const LOCAL_BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.homedir(), "Documents", "EmenuBackup");

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'emenu-admin-secret-key-2026';
const STAFF_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Constant-time string & hex digest comparisons to prevent timing side-channel attacks
function safeCompareStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hashA = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(a).digest();
  const hashB = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function safeCompareHex(hexA, hexB) {
  if (typeof hexA !== 'string' || typeof hexB !== 'string' || hexA.length !== hexB.length || hexA.length % 2 !== 0) {
    return false;
  }
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Normalize Arabic hamza/alef & spacing variants for forgiving username matching
function normalizeArabicUsername(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

// Signed, revocable per-user staff session tokens (emu1.<base64urlPayload>.<hmacHex>)
function generateStaffSessionToken(user) {
  const now = Date.now();
  const payloadObj = {
    sub: String(user.id || user._id || 'env:admin'),
    u: String(user.username || user.name || 'admin'),
    name: String(user.name || user.username || 'المدير العام'),
    role: user.role === 'order_manager' ? 'order_manager' : 'admin',
    shopAccess: ['shop1', 'shop2', 'all'].includes(user.shopAccess) ? user.shopAccess : 'all',
    tv: Number.isInteger(user.tokenVersion) && user.tokenVersion > 0 ? user.tokenVersion : 1,
    iat: now,
    exp: now + STAFF_SESSION_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(`emu1.${encodedPayload}`)
    .digest('hex');
  return `emu1.${encodedPayload}.${sig}`;
}

function verifyStaffSessionTokenCrypto(token) {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed.startsWith('emu1.')) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  const [, encodedPayload, providedSig] = parts;
  const expectedSig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(`emu1.${encodedPayload}`)
    .digest('hex');
  if (!safeCompareHex(providedSig, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload || !payload.sub || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function generateBulkAccessToken() {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const nonce = crypto.randomBytes(12).toString('hex');
  const data = `bulk1.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

// ============ PASSWORD & CUSTOMER AUTH HELPERS ============
function hashCustomerPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyCustomerPassword(password, storedHash, storedPlain) {
  if (storedPlain && safeCompareStrings(String(storedPlain).trim(), String(password).trim())) return true;
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return safeCompareHex(hash, originalHash);
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
    if (!safeCompareHex(signature, expectedSig)) return false;

    if (expectedPhone) {
      const cleanExpected = convertArabicDigits(expectedPhone).toString().replace(/[^0-9]/g, '');
      const cleanTokenPhone = convertArabicDigits(tokenPhone).toString().replace(/[^0-9]/g, '');
      if (cleanExpected.slice(-9) !== cleanTokenPhone.slice(-9)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

// Convert Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) numerals to standard ASCII digits (0-9)
const convertArabicDigits = (str) => {
  if (str === null || str === undefined) return '';
  return str.toString()
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
};

// Canonical unified Libyan phone display structure: 09x-xxxxxxx
const formatCanonicalLibyanPhone = (phone) => {
  if (!phone) return '';
  const converted = convertArabicDigits(phone).trim();
  let digits = converted.replace(/[^0-9]/g, '');
  if (!digits) return converted;

  if (digits.startsWith('00218')) digits = digits.slice(5);
  else if (digits.startsWith('218')) digits = digits.slice(3);

  if (digits.startsWith('9') && digits.length === 9) {
    digits = '0' + digits;
  }

  if (digits.startsWith('09') && digits.length >= 4) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}`;
  }
  return converted;
};

// Generate all possible database variants for a given phone number (for backwards compatibility & flexible search)
const getLibyanPhoneVariants = (phone) => {
  if (!phone) return [];
  const raw = phone.toString().trim();
  const converted = convertArabicDigits(raw).trim();
  const digits = converted.replace(/[^0-9]/g, '');
  const variants = new Set();
  
  if (raw) variants.add(raw);
  if (converted) variants.add(converted);
  if (digits) variants.add(digits);

  let d = digits;
  if (d.startsWith('00218')) d = d.slice(5);
  else if (d.startsWith('218')) d = d.slice(3);
  if (d.startsWith('9') && d.length === 9) d = '0' + d;

  if (d.startsWith('09') && d.length === 10) {
    const formatted = `${d.slice(0, 3)}-${d.slice(3)}`; // 09x-xxxxxxx
    const plain10 = d;                                   // 09xxxxxxxx
    const plain9 = d.slice(1);                          // 9xxxxxxxx
    const intl218 = '218' + plain9;                     // 2189xxxxxxxx
    const intlPlus = '+218' + plain9;                   // +2189xxxxxxxx
    const intl00 = '00218' + plain9;                    // 002189xxxxxxxx
    
    variants.add(formatted);
    variants.add(plain10);
    variants.add(plain9);
    variants.add(intl218);
    variants.add(intlPlus);
    variants.add(intl00);
  } else if (d.length >= 7) {
    variants.add(d);
    if (d.startsWith('09') && d.length >= 4) {
      variants.add(`${d.slice(0, 3)}-${d.slice(3)}`);
    }
  }

  return [...variants].filter(Boolean);
};

// Helper to look up customer by phone with flexible Libyan formatting (any representation)
const findCustomerByPhone = async (phone) => {
  if (!phone) return null;
  const uniqueVariants = getLibyanPhoneVariants(phone);
  if (uniqueVariants.length === 0) return null;

  const matches = await customersCollection.find({ phone: { $in: uniqueVariants } }).toArray();
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // If duplicate documents exist for this phone number, merge them!
  // Prioritize document with password
  matches.sort((a, b) => {
    const aHasPass = !!(a.passwordHash || a.password || a.plainPassword);
    const bHasPass = !!(b.passwordHash || b.password || b.plainPassword);
    if (aHasPass && !bHasPass) return -1;
    if (!aHasPass && bHasPass) return 1;
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
    return aDate - bDate;
  });

  const primary = matches[0];
  const canonicalPhone = formatCanonicalLibyanPhone(phone);
  const duplicates = matches.slice(1);
  const duplicateIds = duplicates.map(d => d._id);

  const combinedName = primary.name || duplicates.find(d => d.name)?.name || 'عميل';
  const combinedPassword = primary.password || duplicates.find(d => d.password)?.password;
  const combinedPasswordHash = primary.passwordHash || duplicates.find(d => d.passwordHash)?.passwordHash;

  await customersCollection.updateOne(
    { _id: primary._id },
    { 
      $set: { 
        name: combinedName, 
        phone: canonicalPhone,
        ...(combinedPassword ? { password: combinedPassword } : {}),
        ...(combinedPasswordHash ? { passwordHash: combinedPasswordHash } : {}),
        lastActive: new Date()
      } 
    }
  );

  if (duplicateIds.length > 0) {
    await customersCollection.deleteMany({ _id: { $in: duplicateIds } });
  }
  await favoritesCollection.updateMany({ phone: { $in: uniqueVariants } }, { $set: { phone: canonicalPhone } }).catch(() => {});
  await ordersCollection.updateMany({ "customerInfo.phone": { $in: uniqueVariants } }, { $set: { "customerInfo.phone": canonicalPhone } }).catch(() => {});
  await ordersCollection2.updateMany({ "customerInfo.phone": { $in: uniqueVariants } }, { $set: { "customerInfo.phone": canonicalPhone } }).catch(() => {});
  await paymentsCollection.updateMany({ customerPhone: { $in: uniqueVariants } }, { $set: { customerPhone: canonicalPhone } }).catch(() => {});

  primary.name = combinedName;
  primary.phone = canonicalPhone;
  if (combinedPassword) primary.password = combinedPassword;
  if (combinedPasswordHash) primary.passwordHash = combinedPasswordHash;

  return primary;
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

const parsePiecesPerUnit = (val) => {
  if (val === undefined || val === null || val === "" || val === "null" || val === "undefined" || val === "none") return null;
  const parsed = Number(val);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
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

// ============ SPA SHELL HANDLER WITH SERVER-SIDE MANIFEST INJECTION ============
// Serves /app and /admin with dynamic manifest, title, and touch-icon injection BEFORE express.static
// intercepts and sends the raw file. This ensures iOS Safari "Add to Home Screen" always captures
// the correct manifest and start_url on the initial HTTP response.
const serveSpaShell = (req, res) => {
  const shop = req.query.shop || '';
  const view = req.query.view || req.query.mode || '';
  const isAdmin = view === 'admin' || req.path.startsWith('/admin');
  const isShop2 = shop === 'shop2' || req.path.startsWith('/shop2');

  const indexPath = path.join(__dirname, "public", "app", "index.html");
  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      return res.sendFile(indexPath);
    }

    let patched = html;

    if (isAdmin) {
      patched = patched
        .replace(/href="\/app\/manifest\.json"/g, 'href="/manifest-admin.json"')
        .replace(/href="\/manifest\.json"/g, 'href="/manifest-admin.json"')
        .replace(/href="\/app\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-admin.png"')
        .replace(/href="\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-admin.png"')
        .replace(/<title>.*?<\/title>/, '<title>لوحة إدارة عبمبر الزروق</title>')
        .replace(/content="عبمبر الزروق"/g, 'content="إدارة الزروق"')
        .replace(/content="#f7f3ec"/g, 'content="#0f172a"');
    } else if (isShop2) {
      patched = patched
        .replace(/href="\/app\/manifest\.json"/g, 'href="/manifest-shop2.json"')
        .replace(/href="\/manifest\.json"/g, 'href="/manifest-shop2.json"')
        .replace(/href="\/app\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-shop2.png"')
        .replace(/href="\/apple-touch-icon\.png"/g, 'href="/apple-touch-icon-shop2.png"')
        .replace(/<title>.*?<\/title>/, '<title>قسم النواشف - حلويات عبمبر الزروق</title>')
        .replace(/content="عبمبر الزروق"/g, 'content="قسم النواشف"');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(patched);
  });
};

// Route app navigations through shell generator (excluding static assets like .js, .css, etc.)
app.get(['/app', '/app/', '/admin', '/admin/'], serveSpaShell);
app.get(['/app/*', '/admin/*'], (req, res, next) => {
  if (req.path.startsWith('/app/assets/') || req.path.includes('.')) {
    return next();
  }
  serveSpaShell(req, res);
});

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
let employeesCollection, employeeJobsCollection, employeeTransactionsCollection;
let backupsCollection;
let telemetryCollection;
let stockReservationsCollection;
let mongoConnected = false;

// ============ IN-MEMORY ANALYTICS CACHE ============
const analyticsServerCache = new Map();
const ANALYTICS_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

const invalidateAnalyticsCache = (targetShop = null) => {
  if (!targetShop) {
    analyticsServerCache.clear();
    return;
  }
  for (const key of analyticsServerCache.keys()) {
    if (key.startsWith(`${targetShop}:`)) {
      analyticsServerCache.delete(key);
    }
  }
};

// ============ POCKETBASE INVENTORY INTEGRATION ============
const POCKETBASE_URL = process.env.POCKETBASE_URL || 'https://crystal-crocodile.pikapod.net';

// Arabic string normalizer for intelligent matching (removes tashkeel, tatweel, normalizes alifs/ta-marbuta/etc.)
const normalizeArabicText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا') // normalize alifs
    .replace(/ة/g, 'ه')     // normalize ta marbuta
    .replace(/ى/g, 'ي')     // normalize alif maqsura
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // remove symbols/emojis/punctuation
    .replace(/\s+/g, ' ')   // collapse spaces
    .trim();
};

// Lightweight fetch wrapper for PocketBase REST API (no SDK dependency)
const pbFetch = async (path, options = {}) => {
  const url = `${POCKETBASE_URL}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PocketBase ${options.method || 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res.json();
};

// Read current inventory level for a PocketBase record
const getInventoryStock = async (recordId) => {
  if (!recordId) return null;
  try {
    return await pbFetch(`/collections/inventory/records/${recordId}`);
  } catch (err) {
    if (err.message && (err.message.includes('404') || err.message.includes("wasn't found"))) {
      return null;
    }
    throw err;
  }
};

// Adjust inventory quantity by delta (negative to deduct, positive to return)
const adjustInventoryStock = async (recordId, delta) => {
  if (!recordId || delta === 0) return null;
  const current = await getInventoryStock(recordId);
  if (!current) {
    console.warn(`[Inventory] adjustInventoryStock: Record ${recordId} not found in PocketBase`);
    return null;
  }
  const currentQty = typeof current.quantity === 'number' ? current.quantity : 0;
  const newQty = Math.max(0, currentQty + delta);
  return pbFetch(`/collections/inventory/records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantity: newQty,
      last_updated_legacy: new Date().toISOString(),
    }),
  });
};

// Reserve inventory for a newly created Shop 2 order (non-blocking)
const reserveInventoryForOrder = async (orderDoc) => {
  if (!stockReservationsCollection || !productsCollection2 || !orderDoc) return [];
  // Never reserve inventory if order is already cancelled
  if (orderDoc.status === 'cancelled') return [];

  const reservationItems = [];
  let cachedPbRecords = null;

  for (const item of (orderDoc.items || [])) {
    try {
      let product = null;
      if (item.productId) {
        product = await productsCollection2.findOne({
          _id: ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : item.productId
        });
      }
      if (!product && item.name) {
        product = await productsCollection2.findOne({ name: item.name });
      }
      if (!product) continue;

      // Never track or reserve stock for products with storage explicitly disabled
      if (product.hasStorage === false) continue;

      let link = product.inventoryLink;
      if (!link || !link.recordId) {
        // Auto-heal: Attempt exact dynamic lookup in PocketBase inventory
        try {
          if (!cachedPbRecords) {
            const pbData = await pbFetch("/collections/inventory/records?perPage=500");
            cachedPbRecords = Array.isArray(pbData.items) ? pbData.items : [];
          }
          const normProdName = normalizeArabicText(product.name || item.name);
          const pbMatch = cachedPbRecords.find(p => normalizeArabicText(p.name) === normProdName);
          if (pbMatch) {
            link = {
              recordId: pbMatch.id,
              legacyId: pbMatch.legacy_id || '',
              itemName: pbMatch.name,
              conversionFactor: 1
            };
            await productsCollection2.updateOne(
              { _id: product._id },
              { $set: { inventoryLink: link } }
            );
            product.inventoryLink = link;
            console.log(`[Inventory] Auto-linked product "${product.name}" to PB item "${pbMatch.name}" (${pbMatch.id})`);
          }
        } catch (matchErr) {
          console.error(`[Inventory] Dynamic auto-link failed for "${product.name}":`, matchErr.message);
        }
      }

      if (!link || !link.recordId) continue;

      const before = await getInventoryStock(link.recordId);
      if (!before) {
        console.warn(`[Inventory] Skipping reservation for "${item.name}": PB item ${link.recordId} not found`);
        continue;
      }

      const factor = Number(link.conversionFactor) || 1;
      const reserveQty = (Number(item.quantity) || 1) * factor;
      const prevStock = typeof before.quantity === 'number' ? before.quantity : 0;

      // Only deduct up to available physical stock; never create negative inventory
      const actualDeducted = Math.min(prevStock, reserveQty);

      if (actualDeducted > 0) {
        await adjustInventoryStock(link.recordId, -actualDeducted);
      }

      reservationItems.push({
        productId: product._id ? product._id.toString() : item.productId,
        productName: item.name || product.name,
        inventoryRecordId: link.recordId,
        inventoryItemName: link.itemName || before.name || '',
        orderedQty: item.quantity,
        conversionFactor: factor,
        reservedQty: reserveQty,
        actuallyDeducted: actualDeducted, // Explicitly tracked to prevent returning unexisted values
        previousStock: prevStock,
        newStock: Math.max(0, prevStock - reserveQty),
      });
    } catch (err) {
      console.error(`[Inventory] Reserve failed for "${item.name}":`, err.message);
    }
  }

  if (reservationItems.length > 0) {
    try {
      const initialStatus = orderDoc.status === 'received' ? 'deducted' : 'reserved';
      await stockReservationsCollection.insertOne({
        orderNumber: orderDoc.orderNumber,
        orderId: orderDoc._id || null,
        status: initialStatus,
        items: reservationItems,
        reservedAt: new Date(),
        ...(initialStatus === 'deducted' ? { deductedAt: new Date() } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbErr) {
      console.error('[Inventory] Failed to save reservation record:', dbErr.message);
    }
  }
  return reservationItems;
};

// Confirm inventory deduction when order status transitions to "received"
const confirmInventoryDeduction = async (orderId) => {
  if (!stockReservationsCollection || !orderId) return;
  try {
    const idFilters = [{ orderId: String(orderId) }];
    if (ObjectId.isValid(orderId)) {
      idFilters.push({ orderId: new ObjectId(orderId) });
    }

    await stockReservationsCollection.updateMany(
      {
        $or: idFilters,
        status: 'reserved',
      },
      { $set: { status: 'deducted', deductedAt: new Date(), updatedAt: new Date() } }
    );
  } catch (err) {
    console.error('[Inventory] Confirm deduction failed:', err.message);
  }
};

// Return inventory when order is cancelled (Safe: only returns genuinely deducted stock)
const returnInventoryForOrder = async (orderId) => {
  if (!stockReservationsCollection || !orderId) return;
  try {
    const idFilters = [{ orderId: String(orderId) }];
    if (ObjectId.isValid(orderId)) {
      idFilters.push({ orderId: new ObjectId(orderId) });
    }

    // Match any active reservations (either 'reserved' or 'deducted' that need to be reversed)
    const reservations = await stockReservationsCollection.find({
      $or: idFilters,
      status: { $in: ['reserved', 'deducted'] }
    }).toArray();

    if (!reservations || reservations.length === 0) return;

    for (const reservation of reservations) {
      if (!Array.isArray(reservation.items)) continue;

      for (const item of reservation.items) {
        try {
          if (!item.inventoryRecordId) continue;

          // Accurately determine how many units were genuinely deducted from physical inventory
          let qtyToReturn = 0;
          if (typeof item.actuallyDeducted === 'number') {
            qtyToReturn = item.actuallyDeducted;
          } else if (typeof item.previousStock === 'number' && typeof item.newStock === 'number') {
            // Backward compatibility for legacy reservations: clamp(0, previousStock - newStock)
            qtyToReturn = Math.max(0, item.previousStock - item.newStock);
          } else {
            // If neither is present, do not return unverified values that could invent phantom stock
            qtyToReturn = 0;
          }

          if (qtyToReturn > 0) {
            await adjustInventoryStock(item.inventoryRecordId, +qtyToReturn);
            console.log(`[Inventory] Safely returned ${qtyToReturn} units for "${item.productName}" (Order #${reservation.orderNumber || ''})`);
          } else {
            console.log(`[Inventory] Zero units were deducted for "${item.productName}" (prevStock: ${item.previousStock}, newStock: ${item.newStock}). No stock added on cancellation.`);
          }
        } catch (pbErr) {
          console.error(`[Inventory] Return failed for "${item.productName}":`, pbErr.message);
        }
      }

      await stockReservationsCollection.updateOne(
        { _id: reservation._id },
        { 
          $set: { 
            status: 'returned', 
            returnedAt: new Date(), 
            updatedAt: new Date() 
          } 
        }
      );
    }
  } catch (err) {
    console.error('[Inventory] Return inventory failed:', err.message);
  }
};

// Handle order edit: return old reservation, re-reserve with new items
const handleOrderEditInventory = async (orderId) => {
  if (!stockReservationsCollection || !ordersCollection2 || !orderId) return;
  try {
    const idFilters = [{ orderId: String(orderId) }];
    if (ObjectId.isValid(orderId)) {
      idFilters.push({ orderId: new ObjectId(orderId) });
    }

    const existingReservations = await stockReservationsCollection.find({
      $or: idFilters,
      status: { $in: ['reserved', 'deducted'] }
    }).toArray();

    // Safely return genuinely deducted stock for previous reservation
    for (const existing of existingReservations) {
      if (Array.isArray(existing.items)) {
        for (const item of existing.items) {
          try {
            if (!item.inventoryRecordId) continue;
            let qtyToReturn = 0;
            if (typeof item.actuallyDeducted === 'number') {
              qtyToReturn = item.actuallyDeducted;
            } else if (typeof item.previousStock === 'number' && typeof item.newStock === 'number') {
              qtyToReturn = Math.max(0, item.previousStock - item.newStock);
            }
            if (qtyToReturn > 0) {
              await adjustInventoryStock(item.inventoryRecordId, +qtyToReturn);
            }
          } catch (pbErr) {
            console.error(`[Inventory] Edit-return failed for "${item.productName}":`, pbErr.message);
          }
        }
      }
      await stockReservationsCollection.deleteOne({ _id: existing._id });
    }

    // Re-reserve with updated order items (only if order is active: pending or ready)
    const order = await ordersCollection2.findOne({
      _id: ObjectId.isValid(orderId) ? new ObjectId(orderId) : orderId
    });
    if (order && order.status !== 'cancelled' && order.status !== 'received') {
      await reserveInventoryForOrder({ ...order, _id: order._id });
    }
  } catch (err) {
    console.error('[Inventory] Order edit inventory handling failed:', err.message);
  }
};

// Background reconciliation: catches orphaned reservations
const reconcileInventoryStock = async () => {
  if (!stockReservationsCollection || !ordersCollection2 || !mongoConnected) return;
  try {
    const staleReservations = await stockReservationsCollection.find({
      status: 'reserved',
      reservedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Check reservations older than 24h
    }).toArray();

    let fixed = 0;
    for (const reservation of staleReservations) {
      const order = await ordersCollection2.findOne({
        _id: ObjectId.isValid(reservation.orderId) ? new ObjectId(reservation.orderId) : reservation.orderId
      });
      if (!order || order.status === 'cancelled') {
        await returnInventoryForOrder(reservation.orderId);
        fixed++;
      } else if (order.status === 'received') {
        await confirmInventoryDeduction(reservation.orderId);
        fixed++;
      }
    }
    if (fixed > 0) {
      console.log(`✓ [Inventory Reconciliation] Fixed ${fixed} stale reservation(s)`);
    }
  } catch (err) {
    console.error('[Inventory Reconciliation] Error:', err.message);
  }
};

// Helper: Cascade sync a Shop 2 product to PocketBase inventory
const cascadeProductToPocketBase = async (productDoc, hasStorage) => {
  if (!productsCollection2 || !productDoc) return null;
  try {
    const shouldHaveStorage = hasStorage === true || hasStorage === 'true';

    if (!shouldHaveStorage) {
      // If product should not have storage, delete its PB record if one exists
      if (productDoc.inventoryLink?.recordId) {
        await pbFetch(`/collections/inventory/records/${productDoc.inventoryLink.recordId}`, {
          method: 'DELETE'
        }).catch(err => console.warn('[Inventory Cascade] Delete PB record error:', err.message));
        await productsCollection2.updateOne(
          { _id: productDoc._id },
          { $set: { hasStorage: false, inventoryLink: null } }
        );
      } else {
        await productsCollection2.updateOne(
          { _id: productDoc._id },
          { $set: { hasStorage: false } }
        );
      }
      return null;
    }

    // Product should have storage
    if (productDoc.inventoryLink?.recordId) {
      // Update existing PB record name and category to match the product
      await pbFetch(`/collections/inventory/records/${productDoc.inventoryLink.recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: productDoc.name.trim(),
          category: (productDoc.category || 'عام').trim(),
          last_updated_legacy: new Date().toISOString()
        })
      }).catch(err => console.warn('[Inventory Cascade] Update PB record error:', err.message));

      await productsCollection2.updateOne(
        { _id: productDoc._id },
        {
          $set: {
            hasStorage: true,
            'inventoryLink.itemName': productDoc.name.trim()
          }
        }
      );
      return productDoc.inventoryLink;
    }

    // Product hasStorage is true, but no inventoryLink exists: create or find one
    const pbList = await pbFetch("/collections/inventory/records?perPage=500").catch(() => ({ items: [] }));
    const records = Array.isArray(pbList.items) ? pbList.items : [];
    let maxId = 0;
    for (const r of records) {
      const lid = parseInt(r.legacy_id, 10);
      if (!isNaN(lid) && lid > maxId) maxId = lid;
    }

    const normName = normalizeArabicText(productDoc.name);
    let matchedPb = records.find(r => r.name.trim() === productDoc.name.trim())
      || records.find(r => normalizeArabicText(r.name) === normName);

    if (!matchedPb) {
      const nextId = (maxId + 1).toString();
      matchedPb = await pbFetch("/collections/inventory/records", {
        method: 'POST',
        body: JSON.stringify({
          name: productDoc.name.trim(),
          category: (productDoc.category || 'عام').trim(),
          quantity: 0,
          min_stock: 0,
          legacy_id: nextId,
          last_updated_legacy: new Date().toISOString()
        })
      });
    }

    const link = {
      recordId: matchedPb.id,
      legacyId: matchedPb.legacy_id || '',
      itemName: matchedPb.name,
      conversionFactor: 1
    };

    await productsCollection2.updateOne(
      { _id: productDoc._id },
      { $set: { hasStorage: true, inventoryLink: link } }
    );
    return link;
  } catch (err) {
    console.error('[Inventory Cascade] Failed to cascade product to PocketBase:', err.message);
    return null;
  }
};

// Helper: Atomic Sequential Order Number Generator
const getNextOrderNumber = async () => {
  const result = await countersCollection.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result.seq;
};

// Helper: Atomic Sequential Employee Transaction Receipt Number Generator
const getNextEmpTxNumber = async () => {
  const result = await countersCollection.findOneAndUpdate(
    { _id: "empTxNumber" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return 1000 + (Number(result?.seq) || 1);
};

// ============ STAFF SESSION CACHE, AUTH & RBAC MIDDLEWARE ============
const STAFF_CACHE_TTL_MS = 5000;
const staffSessionCache = new Map();

const invalidateStaffSessionCache = (userId = null) => {
  if (userId) {
    staffSessionCache.delete(String(userId));
  } else {
    staffSessionCache.clear();
  }
};

const checkMongoDB = (req, res, next) => {
  if (!mongoConnected) {
    return res.status(503).json({ error: "Database not ready" });
  }
  next();
};

const resolveStaffUserFromRequest = async (req) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const candidates = [
    bearerToken,
    req.signedCookies?.admin_session,
    req.signedCookies?.admin_session_shop2
  ].filter((t, idx, arr) => typeof t === 'string' && t.length > 0 && arr.indexOf(t) === idx);

  if (candidates.length === 0) return null;

  for (const rawToken of candidates) {
    const payload = verifyStaffSessionTokenCrypto(rawToken);
    if (!payload) continue;

    if (payload.sub === 'env:admin') {
      return {
        id: 'env:admin',
        username: payload.u || ADMIN_USER,
        name: payload.name || 'المدير العام',
        role: 'admin',
        shopAccess: 'all',
        tokenVersion: 1,
        isEnvAdmin: true
      };
    }

    if (!ObjectId.isValid(payload.sub)) continue;

    if (mongoConnected && adminUsersCollection) {
      const cacheKey = String(payload.sub);
      const now = Date.now();
      let cached = staffSessionCache.get(cacheKey);
      let userDoc = null;

      if (cached && cached.expiresAt > now) {
        userDoc = cached.doc;
      } else {
        try {
          userDoc = await adminUsersCollection.findOne(
            { _id: new ObjectId(payload.sub) },
            { projection: { username: 1, name: 1, role: 1, shopAccess: 1, tokenVersion: 1 } }
          );
          staffSessionCache.set(cacheKey, { doc: userDoc || null, expiresAt: now + STAFF_CACHE_TTL_MS });
        } catch (err) {
          console.error('[Auth] Failed to verify staff session against DB:', err.message);
          continue;
        }
      }

      // Instant revocation on account deletion
      if (!userDoc) continue;

      // Instant revocation on password rotation / tokenVersion bump
      const dbTv = Number.isInteger(userDoc.tokenVersion) && userDoc.tokenVersion > 0 ? userDoc.tokenVersion : 1;
      const tokTv = Number.isInteger(payload.tv) && payload.tv > 0 ? payload.tv : 1;
      if (dbTv !== tokTv) continue;

      return {
        id: String(userDoc._id),
        username: userDoc.username || userDoc.name,
        name: userDoc.name || userDoc.username,
        role: userDoc.role === 'order_manager' ? 'order_manager' : 'admin',
        shopAccess: ['shop1', 'shop2', 'all'].includes(userDoc.shopAccess) ? userDoc.shopAccess : 'all',
        tokenVersion: dbTv,
        isEnvAdmin: false
      };
    }

    // Graceful fallback using verified cryptographic claims if DB is transiently reconnecting
    return {
      id: String(payload.sub),
      username: payload.u || 'staff',
      name: payload.name || payload.u || 'مستخدم',
      role: payload.role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: ['shop1', 'shop2', 'all'].includes(payload.shopAccess) ? payload.shopAccess : 'all',
      tokenVersion: payload.tv || 1,
      isEnvAdmin: false
    };
  }

  return null;
};

const attachStaffSession = async (req, res, next) => {
  try {
    req.staffUser = await resolveStaffUserFromRequest(req);
  } catch (err) {
    req.staffUser = null;
  }
  next();
};

const isStaffSession = (req) => Boolean(req.staffUser);
const isAdminSession = (req) => Boolean(req.staffUser && req.staffUser.role === 'admin');

const verifyShopScopeForUser = (req, res, fixedShop = null) => {
  const user = req.staffUser;
  if (!user) return false;
  if (user.shopAccess === 'all') return true;

  const allowed = user.shopAccess; // 'shop1' or 'shop2'
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');

  let targetShop = fixedShop;
  if (!targetShop) {
    const explicitShop = req.query?.shop || (!isMultipart ? req.body?.shop : null);
    if (explicitShop === 'shop1' || explicitShop === 'shop2') {
      targetShop = explicitShop;
    } else if (!isMultipart) {
      // Pin omitted shop parameter to the user's strictly authorized shop so handlers never default to another shop
      if (req.query) req.query.shop = allowed;
      if (req.body && typeof req.body === 'object' && !req.body.shop) {
        req.body.shop = allowed;
      }
      targetShop = allowed;
    }
  }

  if (targetShop && targetShop !== allowed) {
    const shopLabel = allowed === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي';
    res.status(403).json({
      success: false,
      ok: false,
      code: 'SHOP_FORBIDDEN',
      allowedShop: allowed,
      error: `حسابك مخوّل للوصول إلى ${shopLabel} فقط`,
      message: `حسابك مخوّل للوصول إلى ${shopLabel} فقط`
    });
    return false;
  }

  return true;
};

// Allows any authenticated staff role ('admin' or 'order_manager') within their shopAccess scope
const checkStaffShop = (fixedShop = null) => (req, res, next) => {
  if (!req.staffUser) {
    return res.status(401).json({
      success: false,
      ok: false,
      code: 'UNAUTHENTICATED',
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
      message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً'
    });
  }
  if (!verifyShopScopeForUser(req, res, fixedShop)) return;
  next();
};

// Strictly requires 'admin' role within their shopAccess scope
const requireAdminShop = (fixedShop = null) => (req, res, next) => {
  if (!req.staffUser) {
    return res.status(401).json({
      success: false,
      ok: false,
      code: 'UNAUTHENTICATED',
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
      message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً'
    });
  }
  if (req.staffUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      ok: false,
      code: 'ROLE_FORBIDDEN',
      error: 'هذه العملية متاحة لمدير النظام فقط',
      message: 'هذه العملية متاحة لمدير النظام فقط'
    });
  }
  if (!verifyShopScopeForUser(req, res, fixedShop)) return;
  next();
};

// Strictly requires 'admin' role AND global ('all') shopAccess for system-wide operations (users, full DB backups, global resets)
const requireGlobalAdmin = (req, res, next) => {
  if (!req.staffUser) {
    return res.status(401).json({
      success: false,
      ok: false,
      code: 'UNAUTHENTICATED',
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
      message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً'
    });
  }
  if (req.staffUser.role !== 'admin' || req.staffUser.shopAccess !== 'all') {
    return res.status(403).json({
      success: false,
      ok: false,
      code: 'ROLE_FORBIDDEN',
      error: 'هذه العملية متاحة للمدير العام للنظام فقط',
      message: 'هذه العملية متاحة للمدير العام للنظام فقط'
    });
  }
  next();
};

// Post-multer shop scope check when shop field was submitted inside multipart/form-data
const enforceParsedBodyShopScope = (req, res, next) => {
  if (!req.staffUser || req.staffUser.shopAccess === 'all') return next();
  const bodyShop = req.body?.shop || req.query?.shop || 'shop1';
  if (bodyShop !== req.staffUser.shopAccess) {
    const shopLabel = req.staffUser.shopAccess === 'shop2' ? 'قسم النواشف' : 'المتجر الرئيسي';
    return res.status(403).json({
      success: false,
      code: 'SHOP_FORBIDDEN',
      allowedShop: req.staffUser.shopAccess,
      error: `حسابك مخوّل للوصول إلى ${shopLabel} فقط`
    });
  }
  next();
};

const checkStaff = checkStaffShop(null);
const requireAdmin = requireAdminShop(null);
// Backward-compatible alias pointing to strict admin role check
const checkAdmin = requireAdmin;

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

// Mount per-request staff session resolution across all /api routes
app.use("/api", attachStaffSession);

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
app.get("/api/debug/products-by-category", checkMongoDB, requireGlobalAdmin, async (req, res) => {
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

app.get("/api/debug/purchase-types", checkMongoDB, requireGlobalAdmin, async (req, res) => {
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

app.get("/api/debug/subcategories", checkMongoDB, requireGlobalAdmin, async (req, res) => {
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

// ============ RATE LIMITING ============
const createRateLimiter = (windowMs, maxRequests, options = {}) => {
  const ipCache = new Map();
  const customMessage = options.message || "طلبات كثيرة جداً، يرجى المحاولة مرة أخرى لاحقاً.";
  const skipFn = typeof options.skip === 'function' ? options.skip : null;
  
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
  }, Math.min(windowMs, 5 * 60 * 1000)).unref();

  return (req, res, next) => {
    if (skipFn && skipFn(req)) {
      return next();
    }

    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    
    const timestamps = (ipCache.get(rawIp) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    ipCache.set(rawIp, timestamps);
    
    if (timestamps.length > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil(windowMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      console.log(`[RATE LIMIT EXCEEDED] IP: ${rawIp} on ${req.method} ${req.originalUrl}`);
      return res.status(429).json({
        success: false,
        error: customMessage,
        message: customMessage,
        retryAfterSeconds: retryAfterSec
      });
    }
    next();
  };
};

const loginLimiter = createRateLimiter(15 * 60 * 1000, 10, {
  message: "محاولات تسجيل دخول كثيرة جداً. يرجى الانتظار 15 دقيقة."
});
const customerLimiter = createRateLimiter(5 * 60 * 1000, 60);
const bulkCodeLimiter = createRateLimiter(15 * 60 * 1000, 10, {
  message: "محاولات كثيرة للتحقق من رمز الجملة. يرجى المحاولة لاحقاً."
});
const publicDirectoryLimiter = createRateLimiter(15 * 60 * 1000, 30);
const publicOrderLimiter = createRateLimiter(10 * 60 * 1000, 20, {
  // Never throttle authenticated in-store POS cashiers during peak rush hours
  skip: (req) => isStaffSession(req),
  message: "تم تجاوز الحد المسموح لإرسال الطلبات خلال فترة قصيرة. يرجى الانتظار قليلاً."
});
const telemetryLimiter = createRateLimiter(60 * 1000, 30, {
  message: "Too many telemetry batches"
});

// ============ UNIFIED STAFF LOGIN HANDLER ============
const handleStaffLogin = async (req, res, requestedShop = "shop1") => {
  const { username, password } = req.body || {};
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  const cleanUser = username.trim();
  const cleanPass = password.trim();
  const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
  const cookieOpts = {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure,
    signed: true,
    path: "/",
    maxAge: STAFF_SESSION_TTL_MS
  };

  const issueSessionResponse = (sessionProfile) => {
    const shopAccess = ['shop1', 'shop2', 'all'].includes(sessionProfile.shopAccess) ? sessionProfile.shopAccess : 'all';
    const effectiveShop = shopAccess === 'all' ? requestedShop : shopAccess;
    const token = generateStaffSessionToken(sessionProfile);

    res.clearCookie("admin_session", { path: "/" });
    res.clearCookie("admin_session_shop2", { path: "/" });
    if (shopAccess === 'all' || shopAccess === 'shop1') {
      res.cookie("admin_session", token, cookieOpts);
    }
    if (shopAccess === 'all' || shopAccess === 'shop2') {
      res.cookie("admin_session_shop2", token, cookieOpts);
    }

    return res.json({
      success: true,
      token,
      role: sessionProfile.role === 'order_manager' ? 'order_manager' : 'admin',
      name: sessionProfile.name || sessionProfile.username,
      username: sessionProfile.username || sessionProfile.name,
      shopAccess,
      effectiveShop
    });
  };

  // 1. Search database staff/admin users (exact match + Arabic hamza-normalized fallback)
  if (mongoConnected && adminUsersCollection) {
    try {
      let user = await adminUsersCollection.findOne({
        $or: [{ username: cleanUser }, { name: cleanUser }]
      });

      if (!user) {
        const targetNorm = normalizeArabicUsername(cleanUser);
        if (targetNorm) {
          const allStaff = await adminUsersCollection.find({}).toArray();
          user = allStaff.find(
            u => normalizeArabicUsername(u.username) === targetNorm || normalizeArabicUsername(u.name) === targetNorm
          ) || null;
        }
      }

      if (user) {
        const isMatch = verifyCustomerPassword(cleanPass, user.passwordHash, user.password);
        if (isMatch) {
          const currentTv = Number.isInteger(user.tokenVersion) && user.tokenVersion > 0 ? user.tokenVersion : 1;
          if (!user.passwordHash || !user.tokenVersion) {
            await adminUsersCollection.updateOne(
              { _id: user._id },
              {
                $set: {
                  passwordHash: user.passwordHash || hashCustomerPassword(cleanPass),
                  tokenVersion: currentTv
                },
                ...(user.password ? { $unset: { password: "" } } : {})
              }
            ).catch(err => console.error("Password migration error:", err));
            invalidateStaffSessionCache(user._id);
          }

          return issueSessionResponse({
            _id: user._id,
            username: user.username || user.name,
            name: user.name || user.username,
            role: user.role || "admin",
            shopAccess: user.shopAccess || "all",
            tokenVersion: currentTv
          });
        }
      }
    } catch (e) {
      console.error("Login DB check error:", e);
    }
  }

  // 2. Fallback ENV super-admin check (timing-safe)
  if (safeCompareStrings(cleanUser, String(ADMIN_USER)) && safeCompareStrings(cleanPass, String(ADMIN_PASS))) {
    return issueSessionResponse({
      id: "env:admin",
      username: ADMIN_USER,
      name: "المدير العام",
      role: "admin",
      shopAccess: "all",
      tokenVersion: 1
    });
  }

  return res.status(401).json({ success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
};

app.post("/api/login", loginLimiter, (req, res) => handleStaffLogin(req, res, "shop1"));

app.get("/api/admin-check", checkStaffShop("shop1"), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    user: {
      username: req.staffUser.username,
      name: req.staffUser.name,
      role: req.staffUser.role,
      shopAccess: req.staffUser.shopAccess
    }
  });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("admin_session", { path: "/" });
  res.clearCookie("admin_session_shop2", { path: "/" });
  res.clearCookie("admin", { path: "/" });
  res.clearCookie("admin_shop2", { path: "/" });
  res.json({ success: true });
});

// Rate-limited login selector directory (strips internal _id and privilege roles from unauthenticated responses)
app.get("/api/public/admin-users", publicDirectoryLimiter, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.PUBLIC_STAFF_SELECTOR === "false") {
    return res.json({ success: true, users: [], manualOnly: true });
  }
  try {
    let users = [];
    if (mongoConnected && adminUsersCollection) {
      users = await adminUsersCollection
        .find({}, { projection: { _id: 0, username: 1, name: 1 } })
        .sort({ name: 1 })
        .toArray();
    }
    if (!users || users.length === 0) {
      users = [{ username: ADMIN_USER, name: "المدير العام" }];
    }
    res.json({ success: true, users });
  } catch (err) {
    console.error("Public admin users fetch error:", err);
    res.json({ success: true, users: [{ username: ADMIN_USER, name: "المدير العام" }] });
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
    
    const isStaff = isStaffSession(req);
    const isAdmin = isAdminSession(req);
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
          piecesPerUnit: 1,
          purchaseType: 1,
          tags: 1,
          ...(isStaff ? { chefId: 1, chefName: 1, ...(isAdmin ? { makingCost: 1, chefCoefficient: 1 } : {}) } : {})
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

app.post("/api/verify-bulk-code", bulkCodeLimiter, (req, res) => {
  const rawCode = req.body && req.body.code !== undefined ? String(req.body.code).trim() : "";
  const BULK_CODE = String(process.env.BULK_CODE || "1234").trim();
  if (rawCode && safeCompareStrings(rawCode, BULK_CODE)) {
    const bulkToken = generateBulkAccessToken();
    const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie("bulk_session", bulkToken, {
      httpOnly: true,
      sameSite: "Lax",
      secure: isSecure,
      signed: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true, bulkToken });
  } else {
    res.status(401).json({ error: "Invalid code" });
  }
});

app.post("/api/products", requireAdminShop("shop1"), upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, piecesPerUnit, purchaseType, tags, chefId, chefName } = req.body;
  
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
  const parsedPiecesPerUnit = parsePiecesPerUnit(piecesPerUnit);

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
      piecesPerUnit: parsedPiecesPerUnit,
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

app.put("/api/products/:id", requireAdminShop("shop1"), upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, piecesPerUnit, purchaseType, existingImg, tags, chefId, chefName } = req.body;
  const isFloat = allowFloat === 'true';
  const parsedPriceRegular = parsePrice(price_regular, isFloat);
  const parsedPriceBulk = parsePrice(price_bulk, isFloat);
  const parsedPrice = parsePrice(price, isFloat);
  const parsedMakingCost = Number(makingCost) || 0;
  const parsedPiecesPerUnit = parsePiecesPerUnit(piecesPerUnit);
  
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
      piecesPerUnit: parsedPiecesPerUnit,
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

app.patch("/api/products/:id/availability", requireAdminShop("shop1"), async (req, res) => {
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

app.delete("/api/products/:id", requireAdminShop("shop1"), async (req, res) => {
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

app.post("/api/categories", requireAdminShop("shop1"), async (req, res) => {
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

app.put("/api/categories/:id", requireAdminShop("shop1"), async (req, res) => {
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

app.delete("/api/categories/:id", requireAdminShop("shop1"), async (req, res) => {
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

app.post("/api/tags", checkMongoDB, requireAdminShop("shop1"), async (req, res) => {
  try {
    const { name, color, icon, badgeStyle, placement, description, active } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    const tagDoc = { 
      name: name.trim(), 
      color: color || 'default', 
      icon: icon || 'trophy',
      badgeStyle: badgeStyle || 'gradient',
      placement: placement || 'both',
      description: description || '',
      active: active !== false,
      createdAt: new Date()
    };
    const result = await tagsCollection.insertOne(tagDoc);
    res.status(201).json({ ...tagDoc, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

app.put("/api/tags/:id", checkMongoDB, requireAdminShop("shop1"), async (req, res) => {
  try {
    const { name, color, icon, badgeStyle, placement, description, active } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    
    const currentTag = await tagsCollection.findOne({ _id: new ObjectId(req.params.id) });
    const newName = name.trim();
    
    await tagsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          name: newName, 
          color: color || 'default', 
          icon: icon || 'trophy',
          badgeStyle: badgeStyle || 'gradient',
          placement: placement || 'both',
          description: description || '',
          active: active !== false,
          updatedAt: new Date()
        } 
      }
    );

    // If tag name changed, synchronize all products referencing old name
    if (currentTag && currentTag.name && currentTag.name !== newName) {
      await productsCollection.updateMany(
        { tags: currentTag.name },
        { $set: { "tags.$": newName } }
      );
    }

    res.json({ success: true, name: newName });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

app.delete("/api/tags/:id", checkMongoDB, requireAdminShop("shop1"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const currentTag = await tagsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (currentTag && currentTag.name) {
      // Clean up tag references from products
      await productsCollection.updateMany(
        { tags: currentTag.name },
        { $pull: { tags: currentTag.name } }
      );
    }
    await tagsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// Bulk assign / unassign tag products
app.put("/api/tags/:id/products", checkMongoDB, requireAdminShop("shop1"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: "productIds array required" });
    
    const tag = await tagsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!tag) return res.status(404).json({ error: "Tag not found" });

    const targetObjectIds = productIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    // Add tag to selected products
    if (targetObjectIds.length > 0) {
      await productsCollection.updateMany(
        { _id: { $in: targetObjectIds } },
        { $addToSet: { tags: tag.name } }
      );
    }

    // Remove tag from products not in list
    await productsCollection.updateMany(
      { _id: { $nin: targetObjectIds }, tags: tag.name },
      { $pull: { tags: tag.name } }
    );

    res.json({ success: true, count: targetObjectIds.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag products" });
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

app.post("/api/shop2/categories", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
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

app.put("/api/shop2/categories/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
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

app.delete("/api/shop2/categories/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
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

app.post("/api/shop2/tags", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    const { name, color, icon, badgeStyle, placement, description, active } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    const tagDoc = { 
      name: name.trim(), 
      color: color || 'default', 
      icon: icon || 'trophy',
      badgeStyle: badgeStyle || 'gradient',
      placement: placement || 'both',
      description: description || '',
      active: active !== false,
      createdAt: new Date()
    };
    const result = await tagsCollection2.insertOne(tagDoc);
    res.status(201).json({ ...tagDoc, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Failed to create tag" });
  }
});

app.put("/api/shop2/tags/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    const { name, color, icon, badgeStyle, placement, description, active } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    
    const currentTag = await tagsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    const newName = name.trim();
    
    await tagsCollection2.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          name: newName, 
          color: color || 'default', 
          icon: icon || 'trophy',
          badgeStyle: badgeStyle || 'gradient',
          placement: placement || 'both',
          description: description || '',
          active: active !== false,
          updatedAt: new Date()
        } 
      }
    );

    // If tag name changed, synchronize all shop2 products referencing old name
    if (currentTag && currentTag.name && currentTag.name !== newName) {
      await productsCollection2.updateMany(
        { tags: currentTag.name },
        { $set: { "tags.$": newName } }
      );
    }

    res.json({ success: true, name: newName });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag" });
  }
});

app.delete("/api/shop2/tags/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const currentTag = await tagsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (currentTag && currentTag.name) {
      // Clean up tag references from shop2 products
      await productsCollection2.updateMany(
        { tags: currentTag.name },
        { $pull: { tags: currentTag.name } }
      );
    }
    await tagsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tag" });
  }
});

// Bulk assign / unassign shop2 tag products
app.put("/api/shop2/tags/:id/products", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: "productIds array required" });
    
    const tag = await tagsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (!tag) return res.status(404).json({ error: "Tag not found" });

    const targetObjectIds = productIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));

    // Add tag to selected products
    if (targetObjectIds.length > 0) {
      await productsCollection2.updateMany(
        { _id: { $in: targetObjectIds } },
        { $addToSet: { tags: tag.name } }
      );
    }

    // Remove tag from products not in list
    await productsCollection2.updateMany(
      { _id: { $nin: targetObjectIds }, tags: tag.name },
      { $pull: { tags: tag.name } }
    );

    res.json({ success: true, count: targetObjectIds.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tag products" });
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
    
    const isStaff = isStaffSession(req);
    const isAdmin = isAdminSession(req);
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
          piecesPerUnit: 1,
          purchaseType: 1,
          tags: 1,
          ...(isStaff ? { chefId: 1, chefName: 1, hasStorage: 1, inventoryLink: 1, ...(isAdmin ? { makingCost: 1, chefCoefficient: 1 } : {}) } : {})
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

app.post("/api/shop2/products", checkMongoDB, requireAdminShop("shop2"), upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, piecesPerUnit, purchaseType, tags, chefId, chefName } = req.body;
  
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
  const parsedPiecesPerUnit = parsePiecesPerUnit(piecesPerUnit);

  const hasSomePrice = parsedPriceRegular !== null || parsedPrice !== null || (purchaseType === 'bulk' && parsedPriceBulk !== null);
  if (
    !name ||
    !category ||
    !hasSomePrice
  ) {
    return res.status(400).json({ error: "Missing required fields (name, category, or price)." });
  }
  try {
    const hasStorage = req.body.hasStorage !== undefined 
      ? (req.body.hasStorage === 'true' || req.body.hasStorage === true)
      : true;

    const insertResult = await productsCollection2.insertOne({
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
      piecesPerUnit: parsedPiecesPerUnit,
      purchaseType: purchaseType || "both",
      tags: parsedTags,
      chefId: chefId || '',
      chefName: chefName || '',
      hasStorage: !!hasStorage,
      inventoryLink: null
    });

    if (hasStorage) {
      await cascadeProductToPocketBase({
        _id: insertResult.insertedId,
        name,
        category
      }, true);
    }

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

app.put("/api/shop2/products/:id", checkMongoDB, requireAdminShop("shop2"), upload.single('img'), uploadErrorHandler, async (req, res) => {
  try {
    const { name, desc, price_regular, price_bulk, makingCost, category, subCategory, price, available, allowFloat, piecesPerUnit, purchaseType, existingImg, tags, chefId, chefName } = req.body;
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
    const parsedPiecesPerUnit = parsePiecesPerUnit(piecesPerUnit);

    const hasStorage = req.body.hasStorage !== undefined 
      ? (req.body.hasStorage === 'true' || req.body.hasStorage === true)
      : (product.hasStorage !== false);

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
          piecesPerUnit: parsedPiecesPerUnit,
          purchaseType: purchaseType || "both",
          tags: parsedTags,
          chefId: chefId || '',
          chefName: chefName || '',
          hasStorage: !!hasStorage,
        },
      }
    );

    // Cascade changes to PocketBase
    await cascadeProductToPocketBase({
      _id: new ObjectId(req.params.id),
      name,
      category,
      inventoryLink: product.inventoryLink
    }, hasStorage);

    const response = { success: true };
    if (uploadWarning) {
      response.warning = uploadWarning;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.delete("/api/shop2/products/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await productsCollection2.findOne({ _id: new ObjectId(req.params.id) });
    if (product) {
      await deleteProductImageFromS3(product);
      // Cascade delete PocketBase inventory item
      if (product.inventoryLink?.recordId) {
        await pbFetch(`/collections/inventory/records/${product.inventoryLink.recordId}`, {
          method: 'DELETE'
        }).catch(err => console.warn('[Inventory Cascade] Delete PB item error:', err.message));
      }
    }
    await productsCollection2.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.patch("/api/shop2/products/:id/availability", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
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
app.post("/api/shop2/login", loginLimiter, (req, res) => handleStaffLogin(req, res, "shop2"));

// ============ USER MANAGEMENT APIs (GLOBAL ADMIN ONLY) ============
app.get("/api/admin/users", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const users = await adminUsersCollection.find({}, { projection: { password: 0, passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/admin/users", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const { name, password, role, shopAccess } = req.body || {};
    if (!name || !password || typeof name !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "الاسم وكلمة المرور مطلوبان" });
    }
    const cleanName = name.trim();
    const cleanPass = password.trim();
    if (cleanPass.length < 4) {
      return res.status(400).json({ error: "يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل" });
    }
    const existing = await adminUsersCollection.findOne({ $or: [{ name: cleanName }, { username: cleanName }] });
    if (existing) {
      return res.status(400).json({ error: "هذا الاسم مستخدم بالفعل" });
    }
    const validShopAccess = ['shop1', 'shop2', 'all'].includes(shopAccess) ? shopAccess : 'all';
    const newUser = {
      name: cleanName,
      username: cleanName,
      passwordHash: hashCustomerPassword(cleanPass),
      role: role === 'order_manager' ? 'order_manager' : 'admin',
      shopAccess: validShopAccess,
      tokenVersion: 1,
      createdAt: new Date()
    };
    await adminUsersCollection.insertOne(newUser);
    invalidateStaffSessionCache();
    delete newUser.passwordHash;
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.put("/api/admin/users/:id", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role, shopAccess } = req.body || {};
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const targetUser = await adminUsersCollection.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    const cleanName = name ? String(name).trim() : targetUser.name;
    if (!cleanName) {
      return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    }

    // Check duplicate name with another user
    const duplicate = await adminUsersCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      $or: [{ name: cleanName }, { username: cleanName }]
    });
    if (duplicate) {
      return res.status(400).json({ error: "هذا الاسم مستخدم بالفعل لحساب آخر" });
    }

    const nextRole = role === 'order_manager' ? 'order_manager' : 'admin';
    const nextShopAccess = ['shop1', 'shop2', 'all'].includes(shopAccess) ? shopAccess : 'all';

    // Prevent demoting or scope-restricting the last remaining global admin
    if (targetUser.role === 'admin' && (targetUser.shopAccess || 'all') === 'all') {
      if (nextRole !== 'admin' || nextShopAccess !== 'all') {
        const otherGlobalAdmins = await adminUsersCollection.countDocuments({
          _id: { $ne: new ObjectId(id) },
          role: 'admin',
          $or: [{ shopAccess: 'all' }, { shopAccess: { $exists: false } }]
        });
        if (otherGlobalAdmins === 0) {
          return res.status(400).json({ error: "لا يمكن خفض صلاحية أو تقييد نطاق المدير العام الوحيد للنظام" });
        }
      }
    }

    const currentTv = Number.isInteger(targetUser.tokenVersion) && targetUser.tokenVersion > 0 ? targetUser.tokenVersion : 1;
    let nextTv = currentTv;

    const updateData = {
      name: cleanName,
      username: cleanName,
      role: nextRole,
      shopAccess: nextShopAccess,
      updatedAt: new Date()
    };

    const updateFields = { $set: updateData };
    if (password && String(password).trim().length > 0) {
      const cleanPass = String(password).trim();
      if (cleanPass.length < 4) {
        return res.status(400).json({ error: "يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل" });
      }
      nextTv = currentTv + 1;
      updateData.passwordHash = hashCustomerPassword(cleanPass);
      updateData.tokenVersion = nextTv;
      updateFields.$unset = { password: "" };
    }

    await adminUsersCollection.updateOne({ _id: new ObjectId(id) }, updateFields);
    invalidateStaffSessionCache(id);

    // If the currently logged-in admin rotated their own password, issue a fresh token seamlessly
    let refreshedToken = null;
    if (req.staffUser && String(req.staffUser.id) === String(id) && nextTv !== currentTv) {
      refreshedToken = generateStaffSessionToken({
        _id: id,
        username: cleanName,
        name: cleanName,
        role: nextRole,
        shopAccess: nextShopAccess,
        tokenVersion: nextTv
      });
      const isSecure = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
      const cookieOpts = { httpOnly: true, sameSite: "Lax", secure: isSecure, signed: true, path: "/", maxAge: STAFF_SESSION_TTL_MS };
      res.cookie("admin_session", refreshedToken, cookieOpts);
      res.cookie("admin_session_shop2", refreshedToken, cookieOpts);
    }

    res.json({ success: true, ...(refreshedToken ? { token: refreshedToken } : {}) });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/api/admin/users/:id", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (req.staffUser && String(req.staffUser.id) === String(id)) {
      return res.status(400).json({ error: "لا يمكنك حذف حسابك النشط حالياً" });
    }

    const targetUser = await adminUsersCollection.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    if (targetUser.role === 'admin' && (targetUser.shopAccess || 'all') === 'all') {
      const otherGlobalAdmins = await adminUsersCollection.countDocuments({
        _id: { $ne: new ObjectId(id) },
        role: 'admin',
        $or: [{ shopAccess: 'all' }, { shopAccess: { $exists: false } }]
      });
      if (otherGlobalAdmins === 0) {
        return res.status(400).json({ error: "لا يمكن حذف المدير العام الوحيد للنظام" });
      }
    }

    await adminUsersCollection.deleteOne({ _id: new ObjectId(id) });
    invalidateStaffSessionCache(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.get("/api/shop2/admin-check", checkStaffShop("shop2"), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    user: {
      username: req.staffUser.username,
      name: req.staffUser.name,
      role: req.staffUser.role,
      shopAccess: req.staffUser.shopAccess
    }
  });
});

// ============ REUSABLE TELEMETRY INSIGHTS COMPUTATION ============
async function computeTelemetryInsights(shop, startDateObj, endDateObj) {
  const defaultInsights = {
    success: true,
    funnel: { totalSessions: 0, cartSessions: 0, checkoutSessions: 0, orderSessions: 0, conversionRate: 0, cartConversionRate: 0, cartAbandonmentRate: 0 },
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    topCategories: [],
    avgDwellSeconds: 0
  };
  if (!mongoConnected || !telemetryCollection) return defaultInsights;

  try {
    const matchFilter = {};
    if (startDateObj && endDateObj) {
      matchFilter.timestamp = { $gte: startDateObj, $lte: endDateObj };
    } else if (startDateObj) {
      matchFilter.timestamp = { $gte: startDateObj };
    }
    if (shop === "shop1" || shop === "shop2") {
      matchFilter.shop = shop;
    }

    const [funnelSummaryArr, topCategoriesRaw, dwellResult] = await Promise.all([
      telemetryCollection.aggregate([
        {
          $match: {
            ...matchFilter,
            event: { $in: ["page_view", "cart_add", "checkout_step", "order_complete"] }
          }
        },
        {
          $group: {
            _id: "$sessionId",
            events: { $addToSet: "$event" },
            device: { $first: "$device" }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            cartSessions: { $sum: { $cond: [{ $in: ["cart_add", "$events"] }, 1, 0] } },
            checkoutSessions: { $sum: { $cond: [{ $in: ["checkout_step", "$events"] }, 1, 0] } },
            orderSessions: { $sum: { $cond: [{ $in: ["order_complete", "$events"] }, 1, 0] } },
            mobile: {
              $sum: {
                $cond: [{ $not: [{ $in: ["$device", ["tablet", "desktop"]] }] }, 1, 0]
              }
            },
            tablet: { $sum: { $cond: [{ $eq: ["$device", "tablet"] }, 1, 0] } },
            desktop: { $sum: { $cond: [{ $eq: ["$device", "desktop"] }, 1, 0] } }
          }
        }
      ]).toArray(),
      telemetryCollection.aggregate([
        {
          $match: {
            ...matchFilter,
            event: "category_select",
            "metadata.categoryName": { $exists: true, $ne: "" }
          }
        },
        {
          $group: {
            _id: "$metadata.categoryName",
            interactions: { $sum: 1 }
          }
        },
        { $sort: { interactions: -1 } },
        { $limit: 6 }
      ]).toArray(),
      telemetryCollection.aggregate([
        {
          $match: {
            ...matchFilter,
            event: "product_dwell",
            "metadata.dwellMs": { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgDwellMs: { $avg: "$metadata.dwellMs" },
            sampleCount: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    const funnelSummary = funnelSummaryArr[0] || {};
    const totalSessions = funnelSummary.totalSessions || 0;
    const cartSessions = funnelSummary.cartSessions || 0;
    const checkoutSessions = funnelSummary.checkoutSessions || 0;
    const orderSessions = funnelSummary.orderSessions || 0;
    const deviceCounts = {
      mobile: funnelSummary.mobile || 0,
      tablet: funnelSummary.tablet || 0,
      desktop: funnelSummary.desktop || 0
    };

    const conversionRate = totalSessions > 0 ? Math.round((orderSessions / totalSessions) * 1000) / 10 : 0;
    const cartConversionRate = cartSessions > 0 ? Math.round((orderSessions / cartSessions) * 1000) / 10 : 0;
    const cartAbandonmentRate = cartSessions > 0 ? Math.round(((cartSessions - orderSessions) / cartSessions) * 1000) / 10 : 0;
    const avgDwellSeconds = dwellResult.length > 0 && dwellResult[0].avgDwellMs
      ? Math.round(dwellResult[0].avgDwellMs / 100) / 10
      : 0;

    return {
      success: true,
      funnel: {
        totalSessions,
        cartSessions,
        checkoutSessions,
        orderSessions,
        conversionRate,
        cartConversionRate,
        cartAbandonmentRate
      },
      devices: deviceCounts,
      topCategories: topCategoriesRaw.map(c => ({ name: c._id, interactions: c.interactions })),
      avgDwellSeconds
    };
  } catch (telErr) {
    console.warn("[Telemetry Insights] Warning:", telErr.message);
    return defaultInsights;
  }
}

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

  // Check in-memory server cache for instant response (< 2ms)
  const cacheKey = `${shop}:${startDateStr}:${endDateStr}`;
  const cached = analyticsServerCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL_MS)) {
    return res.json(cached.data);
  }
  
  try {
    const inactiveFilterDate = (startDateObj && startDateObj.getTime() > 0) 
      ? startDateObj 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel Batch Fetch: Run all core collection reads & telemetry concurrently
    const [
      allSuccessfulOrders,
      allShopPayments,
      allShopProducts,
      favCounts,
      inactiveCustsRaw,
      telemetryInsights
    ] = await Promise.all([
      ordColl.find({ status: { $in: ["received", "completed"] } }).toArray(),
      paymentsCollection.find({ shop, isCancelled: { $ne: true }, status: { $ne: 'cancelled' } }).toArray(),
      prodColl.find({}).toArray(),
      favoritesCollection.aggregate([
        { $match: { shop } },
        { $group: { _id: "$productId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray(),
      customersCollection.find({
        $or: [
          { lastActive: { $lt: inactiveFilterDate } },
          { lastActive: { $exists: false } },
          { lastActive: null }
        ]
      }).sort({ lastActive: -1 }).limit(10).toArray(),
      computeTelemetryInsights(shop, startDateObj, endDateObj)
    ]);

    // 1. Build product maps and active product filters in-memory
    const isProductAvailable = (p) => {
      if (!p) return false;
      if (p.available === false || p.available === "false" || p.available === 0 || p.available === "0") {
        return false;
      }
      return true;
    };

    const availableProductIdsSet = new Set();
    const prodCatMap = new Map();
    const favProdMap = {};
    const availableProducts = [];

    for (const p of allShopProducts) {
      const idStr = p._id.toString();
      prodCatMap.set(idStr, p.category || "غير مصنف");
      if (isProductAvailable(p)) {
        availableProductIdsSet.add(idStr);
        availableProducts.push(p);
        favProdMap[idStr] = p.name;
      }
    }

    // 2. Filter orders by effective receiving date (rec_date)
    const filteredOrdersList = [];
    for (const order of allSuccessfulOrders) {
      const effDate = getOrderEffectiveDateStr(order);
      if (!effDate) continue;
      if (startDateStr && endDateStr) {
        if (effDate >= startDateStr && effDate <= endDateStr) filteredOrdersList.push(order);
      } else if (startDateStr) {
        if (effDate >= startDateStr) filteredOrdersList.push(order);
      } else if (endDateStr) {
        if (effDate <= endDateStr) filteredOrdersList.push(order);
      } else {
        filteredOrdersList.push(order);
      }
    }

    // 3. Payments mapping for payment methods split
    const orderPaymentsMap = new Map();
    for (const p of allShopPayments) {
      if (Array.isArray(p.distributedTo)) {
        for (const dist of p.distributedTo) {
          if (dist.orderId) {
            const idStr = dist.orderId.toString();
            if (!orderPaymentsMap.has(idStr)) orderPaymentsMap.set(idStr, []);
            orderPaymentsMap.get(idStr).push({
              method: p.method || 'cash',
              applied: Number(dist.applied) || 0
            });
          }
        }
      }
    }

    // 4. Single-pass in-memory metrics aggregation
    let totalRevenue = 0;
    const uniquePhones = new Set();
    const trendMap = {};
    const priceModeSplit = { regular: { revenue: 0, count: 0 }, bulk: { revenue: 0, count: 0 } };
    const paymentMethodsSplit = { cash: { revenue: 0, count: 0 }, card: { revenue: 0, count: 0 }, bank_transfer: { revenue: 0, count: 0 } };
    const topProductsMap = new Map();
    const topCustomersMap = new Map();
    const categorySalesMap = {};
    const soldProductIds = new Set();

    for (const ord of filteredOrdersList) {
      const ordRev = Number(ord.totalPrice) || 0;
      totalRevenue += ordRev;
      if (ord.customerInfo && ord.customerInfo.phone) {
        uniquePhones.add(ord.customerInfo.phone);
      }

      // Revenue trend
      const effDate = getOrderEffectiveDateStr(ord);
      if (effDate) {
        if (!trendMap[effDate]) {
          trendMap[effDate] = { date: effDate, revenue: 0, orders: 0 };
        }
        trendMap[effDate].revenue += ordRev;
        trendMap[effDate].orders += 1;
      }

      // Price mode split
      const modeKey = ord.priceMode === "bulk" ? "bulk" : "regular";
      priceModeSplit[modeKey].revenue += ordRev;
      priceModeSplit[modeKey].count += 1;

      // Payments split
      const idStr = ord._id.toString();
      const paymentsForOrder = orderPaymentsMap.get(idStr);
      if (paymentsForOrder && paymentsForOrder.length > 0) {
        const seenMethodsInOrder = new Set();
        let totalAppliedFromPayments = 0;
        for (const p of paymentsForOrder) {
          const key = p.method === 'card' ? 'card' : (p.method === 'bank_transfer' ? 'bank_transfer' : 'cash');
          paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + p.applied) * 100) / 100;
          seenMethodsInOrder.add(key);
          totalAppliedFromPayments += p.applied;
        }
        for (const m of seenMethodsInOrder) {
          paymentMethodsSplit[m].count += 1;
        }
        const directPaidRemainder = Math.round(((Number(ord.paidAmount) || 0) - totalAppliedFromPayments) * 100) / 100;
        if (directPaidRemainder > 0.01) {
          const key = ord.paymentMethod === 'card' ? 'card' : (ord.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash');
          paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + directPaidRemainder) * 100) / 100;
          if (!seenMethodsInOrder.has(key)) {
            paymentMethodsSplit[key].count += 1;
          }
        }
      } else if ((Number(ord.paidAmount) || 0) > 0) {
        const key = ord.paymentMethod === 'card' ? 'card' : (ord.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash');
        const paid = Number(ord.paidAmount) || 0;
        paymentMethodsSplit[key].revenue = Math.round((paymentMethodsSplit[key].revenue + paid) * 100) / 100;
        paymentMethodsSplit[key].count += 1;
      }

      // Top Customers
      if (ord.customerInfo && ord.customerInfo.phone) {
        const ph = ord.customerInfo.phone;
        if (!topCustomersMap.has(ph)) {
          topCustomersMap.set(ph, {
            phone: ph,
            name: ord.customerInfo.name || "عميل مجهول",
            totalSpent: 0,
            orderCount: 0
          });
        }
        const c = topCustomersMap.get(ph);
        c.totalSpent += ordRev;
        c.orderCount += 1;
      }

      // Items: Top Products & Category Sales
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          if (!it) continue;
          const pid = it.productId ? it.productId.toString() : '';
          const qty = Number(it.quantity) || 0;
          const price = Number(it.price) || 0;
          const itemRev = price * qty;

          if (pid) {
            soldProductIds.add(pid);
            if (!topProductsMap.has(pid)) {
              topProductsMap.set(pid, {
                productId: it.productId,
                name: it.name || "منتج مجهول",
                quantity: 0,
                revenue: 0
              });
            }
            const prodObj = topProductsMap.get(pid);
            prodObj.quantity += qty;
            prodObj.revenue += itemRev;

            const cat = prodCatMap.get(pid) || "غير مصنف";
            if (!categorySalesMap[cat]) {
              categorySalesMap[cat] = { category: cat, revenue: 0, count: 0 };
            }
            categorySalesMap[cat].revenue += itemRev;
            categorySalesMap[cat].count += 1;
          }
        }
      }
    }

    // 5. Final metrics assembly
    const orderCount = filteredOrdersList.length;
    const totalPaid = Math.round((paymentMethodsSplit.cash.revenue + paymentMethodsSplit.card.revenue + paymentMethodsSplit.bank_transfer.revenue) * 100) / 100;
    const totalRemaining = Math.max(0, Math.round((totalRevenue - totalPaid) * 100) / 100);

    const kpi = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      orderCount,
      avgOrderValue: orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0,
      activeCustomers: uniquePhones.size,
      totalPaid,
      totalRemaining
    };

    const revenueTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    const topProductsFormatted = Array.from(topProductsMap.values())
      .filter(p => p.productId && availableProductIdsSet.has(p.productId.toString()))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topCustomers = Array.from(topCustomersMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const categorySales = Object.values(categorySalesMap)
      .sort((a, b) => b.revenue - a.revenue);

    const topFavorites = favCounts
      .filter(f => favProdMap[f._id.toString()])
      .slice(0, 10)
      .map(f => ({
        name: favProdMap[f._id.toString()],
        count: f.count
      }));

    const inactiveCustomers = inactiveCustsRaw.map(c => ({
      phone: c.phone,
      name: c.name || "عميل مجهول",
      lastActive: c.lastActive
    }));

    const lowPerformingProducts = availableProducts
      .filter(p => !soldProductIds.has(p._id.toString()))
      .slice(0, 10)
      .map(p => ({
        productId: p._id,
        name: p.name,
        category: p.category || "غير مصنف",
        price: p.price
      }));

    const responsePayload = {
      kpi,
      revenueTrend,
      priceModeSplit,
      paymentMethodsSplit,
      topProducts: topProductsFormatted,
      topCustomers,
      categorySales,
      topFavorites,
      inactiveCustomers,
      lowPerformingProducts,
      telemetryInsights
    };

    // Store in memory cache
    analyticsServerCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    
    res.json(responsePayload);
    
  } catch (err) {
    console.error("Aggregation analytics error:", err);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// ============ INTERACTION TELEMETRY & BEHAVIORAL ANALYTICS ============
// Recursively strip MongoDB operator keys ($ / .) and cap telemetry metadata payload size
const sanitizeTelemetryMetadata = (rawMeta, depth = 0) => {
  if (!rawMeta || typeof rawMeta !== 'object' || Array.isArray(rawMeta) || depth > 3) return {};
  const cleaned = {};
  const keys = Object.keys(rawMeta).slice(0, 20);
  for (const key of keys) {
    if (!key || key.startsWith('$') || key.includes('.')) continue;
    const safeKey = key.slice(0, 40);
    const val = rawMeta[key];
    if (val === null || typeof val === 'boolean') {
      cleaned[safeKey] = val;
    } else if (typeof val === 'number') {
      cleaned[safeKey] = Number.isFinite(val) ? val : null;
    } else if (typeof val === 'string') {
      cleaned[safeKey] = val.slice(0, 256);
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      cleaned[safeKey] = sanitizeTelemetryMetadata(val, depth + 1);
    }
  }
  try {
    if (JSON.stringify(cleaned).length > 2048) return {};
  } catch {
    return {};
  }
  return cleaned;
};

// Public ingestion endpoint for anonymous client interaction telemetry (inspired by UX Datasets: 03_interaction_telemetry)
app.post("/api/telemetry/batch", telemetryLimiter, async (req, res) => {
  if (!mongoConnected || !telemetryCollection) {
    return res.status(200).json({ success: false, reason: "Database initializing" });
  }

  try {
    const { sessionId, events } = req.body || {};
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const safeSessionId = typeof sessionId === 'string' ? sessionId.slice(0, 64) : 'unknown';
    const now = new Date();

    // Map and sanitize each event (limit batch to 50 max to prevent abuse)
    const docs = events
      .filter(evt => evt && typeof evt === 'object')
      .slice(0, 50)
      .map(evt => {
        let evtDate = now;
        if (evt.timestamp) {
          const parsed = new Date(evt.timestamp);
          if (!isNaN(parsed.getTime())) evtDate = parsed;
        }

        return {
          sessionId: safeSessionId,
          event: typeof evt.event === 'string' ? evt.event.slice(0, 40) : 'unknown',
          shop: evt.shop === 'shop2' ? 'shop2' : 'shop1',
          device: evt.device === 'tablet' ? 'tablet' : evt.device === 'desktop' ? 'desktop' : 'mobile',
          timestamp: evtDate,
          viewportWidth: typeof evt.viewportWidth === 'number' && Number.isFinite(evt.viewportWidth) ? evt.viewportWidth : null,
          metadata: sanitizeTelemetryMetadata(evt.metadata)
        };
      });

    if (docs.length > 0) {
      await telemetryCollection.insertMany(docs, { ordered: false });
    }

    res.status(200).json({ success: true, count: docs.length });
  } catch (err) {
    // Non-blocking response for client telemetry
    res.status(200).json({ success: false, error: err.message });
  }
});

// Admin UX Insights aggregation endpoint
app.get("/api/admin/telemetry/insights", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const shop = req.query.shop;
    const days = parseInt(req.query.days, 10) || 7;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const insights = await computeTelemetryInsights(shop, cutoff, new Date());
    insights.periodDays = days;
    res.json(insights);
  } catch (err) {
    console.error("Telemetry insights aggregation error:", err);
    res.status(500).json({ success: false, error: "Failed to generate UX insights" });
  }
});

// ============ ADMIN ORDERS & CUSTOMERS APIs ============

// Get all orders for the admin panel (returns complete order history by default)
app.get("/api/admin/orders", checkMongoDB, checkStaff, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const { status, deliveryDate, phone, limit: limitParam } = req.query;
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    const query = {};
    if (status) {
      query.status = status;
    }
    if (deliveryDate && typeof deliveryDate === "string") {
      query.deliveryDate = deliveryDate.trim().slice(0, 10);
    }
    if (phone && typeof phone === "string") {
      query["customerInfo.phone"] = { $in: getLibyanPhoneVariants(phone) };
    }

    let cursor = ordColl.find(query).sort({ createdAt: -1 });
    const parsedLimit = Number(limitParam);
    if (limitParam && Number.isFinite(parsedLimit) && parsedLimit > 0) {
      cursor = cursor.limit(parsedLimit);
    }
    const orders = await cursor.toArray();
    res.json(orders);
  } catch (err) {
    console.error("Fetch admin orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Update order status
app.put("/api/admin/orders/:id/status", checkMongoDB, checkStaff, async (req, res) => {
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

    // Inventory lifecycle hooks (Shop 2 only, non-blocking)
    if (shop === 'shop2') {
      try {
        if (status === 'received') {
          await confirmInventoryDeduction(id);
        } else if (status === 'cancelled') {
          await returnInventoryForOrder(id);
        } else if (status === 'pending' || status === 'ready') {
          // If order is transitioned back from cancelled, re-reserve inventory
          const ord = await ordColl.findOne({ _id: new ObjectId(id) });
          const hasActiveRes = await stockReservationsCollection.findOne({
            $or: [{ orderId: new ObjectId(id) }, { orderId: String(id) }],
            status: { $in: ['reserved', 'deducted'] }
          });
          if (!hasActiveRes && ord && Array.isArray(ord.items)) {
            await reserveInventoryForOrder({ ...ord, _id: ord._id });
          }
        }
      } catch (invErr) {
        console.error('[Inventory] Status hook error (non-blocking):', invErr.message);
      }
    }

    invalidateAnalyticsCache(shop);

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
app.put("/api/admin/orders/:id", checkMongoDB, checkStaff, async (req, res) => {
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
        piecesPerUnit: parsePiecesPerUnit(item.piecesPerUnit),
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
        const canonicalPhone = formatCanonicalLibyanPhone(updateDoc.customerInfo.phone);
        updateDoc.customerInfo.phone = canonicalPhone;
        const existingCust = await findCustomerByPhone(canonicalPhone);
        if (existingCust) {
          await customersCollection.updateOne(
            { _id: existingCust._id },
            { 
              $set: { 
                phone: canonicalPhone,
                lastActive: new Date() 
              } 
            }
          );
        } else {
          await customersCollection.updateOne(
            { phone: canonicalPhone },
            { 
              $setOnInsert: { 
                name: updateDoc.customerInfo.name || 'عميل',
                phone: canonicalPhone,
                createdAt: new Date()
              },
              $set: {
                lastActive: new Date()
              }
            },
            { upsert: true }
          );
        }
      } catch (custErr) {
        console.warn("Failed to auto-upsert customer on order edit:", custErr);
      }
    }

    // Inventory lifecycle hooks on order edit (Shop 2 only, non-blocking)
    if (shop === 'shop2') {
      try {
        if (updateDoc.status === 'cancelled') {
          await returnInventoryForOrder(id);
        } else if (updateDoc.status === 'received') {
          await confirmInventoryDeduction(id);
        } else if (updateDoc.items) {
          await handleOrderEditInventory(id);
        }
      } catch (invErr) {
        console.error('[Inventory] Edit hook error (non-blocking):', invErr.message);
      }
    }

    invalidateAnalyticsCache(shop);

    res.json({ success: true });
  } catch (err) {
    console.error("Full order edit error:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ============ INVENTORY INTEGRATION ADMIN ROUTES ============

// 1. Fetch inventory items list from PocketBase with computed active reservations
app.get("/api/admin/inventory/items", checkMongoDB, checkStaffShop("shop2"), async (req, res) => {
  try {
    const pbData = await pbFetch("/collections/inventory/records?sort=name&perPage=500");
    const records = Array.isArray(pbData.items) ? pbData.items : (Array.isArray(pbData) ? pbData : []);

    const shop = req.query.shop || "shop2";
    const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;
    const targetOrdersColl = (shop === "shop1") ? ordersCollection : ordersCollection2;

    // Get list of linked e-Menu products that have storage enabled
    let linkedProductsMap = {};
    const prodById = new Map();
    const prodByName = new Map();

    if (targetColl) {
      const linkedProds = await targetColl.find({
        hasStorage: { $ne: false },
        "inventoryLink.recordId": { $exists: true, $ne: null }
      }).project({ name: 1, inventoryLink: 1 }).toArray();

      for (const p of linkedProds) {
        if (p.inventoryLink?.recordId) {
          linkedProductsMap[p.inventoryLink.recordId] = {
            productId: p._id,
            productName: p.name,
            conversionFactor: p.inventoryLink.conversionFactor || 1
          };
          prodById.set(p._id.toString(), p);
          prodByName.set(p.name.trim(), p);
          prodByName.set(normalizeArabicText(p.name), p);
        }
      }
    }

    // Get active reservations computed directly from waiting orders (status: pending, ready)
    let reservedMap = {};
    let waitingOrderCountMap = {};

    if (targetOrdersColl) {
      const waitingOrders = await targetOrdersColl.find({
        status: { $in: ["pending", "ready"] }
      }).project({ items: 1, orderNumber: 1, status: 1 }).toArray();

      for (const order of waitingOrders) {
        if (!Array.isArray(order.items)) continue;
        for (const it of order.items) {
          const prodIdStr = it.productId ? it.productId.toString() : '';
          const p = (prodIdStr && prodById.get(prodIdStr))
            || (it.name && prodByName.get(it.name.trim()))
            || (it.name && prodByName.get(normalizeArabicText(it.name)));

          if (p && p.inventoryLink?.recordId) {
            const recId = p.inventoryLink.recordId;
            const factor = Number(p.inventoryLink.conversionFactor) || 1;
            const qty = (Number(it.quantity) || 1) * factor;
            reservedMap[recId] = (reservedMap[recId] || 0) + qty;
            waitingOrderCountMap[recId] = (waitingOrderCountMap[recId] || 0) + 1;
          }
        }
      }
    }

    // Also check stockReservationsCollection for any additional active reservations (excluding cancelled/received orders)
    if (stockReservationsCollection) {
      const activeRes = await stockReservationsCollection.aggregate([
        { $match: { status: "reserved" } },
        {
          $lookup: {
            from: "orders",
            localField: "orderId",
            foreignField: "_id",
            as: "orderDoc"
          }
        },
        {
          $match: {
            $or: [
              { orderDoc: { $size: 0 } },
              { "orderDoc.0.status": { $in: ["pending", "ready"] } }
            ]
          }
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.inventoryRecordId",
            totalReserved: { $sum: "$items.reservedQty" }
          }
        }
      ]).toArray();

      for (const r of activeRes) {
        if (r._id && (!reservedMap[r._id] || r.totalReserved > reservedMap[r._id])) {
          reservedMap[r._id] = r.totalReserved;
        }
      }
    }

    // Storage items cascade directly from shop products (only products with storage enabled)
    const enriched = records
      .filter(rec => !!linkedProductsMap[rec.id])
      .map(rec => {
        const reserved = reservedMap[rec.id] || 0;
        const totalQty = typeof rec.quantity === 'number' ? rec.quantity : 0;
        const available = Math.max(0, totalQty - reserved);
        return {
          id: rec.id,
          legacy_id: rec.legacy_id || '',
          name: rec.name || '',
          category: rec.category || '',
          quantity: totalQty,
          min_stock: typeof rec.min_stock === 'number' ? rec.min_stock : 0,
          reserved_qty: reserved,
          waiting_orders_count: waitingOrderCountMap[rec.id] || (reserved > 0 ? 1 : 0),
          available_qty: available,
          linkedProduct: linkedProductsMap[rec.id] || null,
          updated: rec.updated || rec.last_updated_legacy || ''
        };
      });

    res.json({ success: true, items: enriched });
  } catch (err) {
    console.error("Fetch inventory items error:", err.message);
    res.status(502).json({
      error: "تعذر الاتصال بخادم المخزون PocketBase",
      details: err.message,
      unreachable: true
    });
  }
});

// 2. Fetch single inventory item stock
app.get("/api/admin/inventory/stock/:recordId", checkMongoDB, checkStaffShop("shop2"), async (req, res) => {
  try {
    const item = await getInventoryStock(req.params.recordId);
    let reserved = 0;
    if (stockReservationsCollection) {
      const resDocs = await stockReservationsCollection.aggregate([
        { $match: { status: "reserved" } },
        { $unwind: "$items" },
        { $match: { "items.inventoryRecordId": req.params.recordId } },
        { $group: { _id: null, total: { $sum: "$items.reservedQty" } } }
      ]).toArray();
      if (resDocs.length > 0) reserved = resDocs[0].total;
    }

    res.json({
      success: true,
      item,
      reservedQuantity: reserved,
      availableQuantity: Math.max(0, (item.quantity || 0) - reserved)
    });
  } catch (err) {
    console.error("Get inventory stock error:", err.message);
    res.status(502).json({ error: "Failed to get stock from PocketBase", details: err.message });
  }
});

// 2a. Adjust or set quantity of an inventory item in PocketBase
app.patch("/api/admin/inventory/items/:id/quantity", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { id } = req.params;
  const { quantity, delta } = req.body;

  try {
    let newQty;
    if (typeof quantity === 'number') {
      newQty = Math.max(0, Math.round(quantity));
    } else if (typeof delta === 'number') {
      const current = await getInventoryStock(id);
      const currentQty = typeof current.quantity === 'number' ? current.quantity : 0;
      newQty = Math.max(0, currentQty + Math.round(delta));
    } else {
      return res.status(400).json({ error: "Missing quantity or delta parameter" });
    }

    const updated = await pbFetch(`/collections/inventory/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        quantity: newQty,
        last_updated_legacy: new Date().toISOString()
      })
    });

    res.json({ success: true, item: updated, quantity: newQty });
  } catch (err) {
    console.error("Update inventory quantity error:", err.message);
    res.status(500).json({ error: "Failed to update quantity in PocketBase", details: err.message });
  }
});

// 2b. Update item details (name, category, min_stock, quantity)
app.put("/api/admin/inventory/items/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { id } = req.params;
  const { name, category, min_stock, quantity } = req.body;

  try {
    const payload = {
      last_updated_legacy: new Date().toISOString()
    };
    if (name !== undefined) payload.name = String(name).trim();
    if (category !== undefined) payload.category = String(category).trim();
    if (min_stock !== undefined) payload.min_stock = Math.max(0, Math.round(Number(min_stock)));
    if (quantity !== undefined) payload.quantity = Math.max(0, Math.round(Number(quantity)));

    const updated = await pbFetch(`/collections/inventory/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    res.json({ success: true, item: updated });
  } catch (err) {
    console.error("Update inventory item error:", err.message);
    res.status(500).json({ error: "Failed to update item in PocketBase", details: err.message });
  }
});

// 2c. Create new inventory item
app.post("/api/admin/inventory/items", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { name, category, quantity, min_stock } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Item name is required" });
  }

  try {
    const pbList = await pbFetch("/collections/inventory/records?perPage=500");
    const records = Array.isArray(pbList.items) ? pbList.items : [];
    let maxId = 0;
    for (const r of records) {
      const lid = parseInt(r.legacy_id, 10);
      if (!isNaN(lid) && lid > maxId) maxId = lid;
    }
    const nextId = (maxId + 1).toString();

    const payload = {
      name: name.trim(),
      category: (category || '').trim(),
      quantity: Math.max(0, Math.round(Number(quantity) || 0)),
      min_stock: Math.max(0, Math.round(Number(min_stock) || 5)),
      legacy_id: nextId,
      last_updated_legacy: new Date().toISOString()
    };

    const created = await pbFetch("/collections/inventory/records", {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    res.json({ success: true, item: created });
  } catch (err) {
    console.error("Create inventory item error:", err.message);
    res.status(500).json({ error: "Failed to create item in PocketBase", details: err.message });
  }
});

// 2d. Delete inventory item
app.delete("/api/admin/inventory/items/:id", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { id } = req.params;
  try {
    await pbFetch(`/collections/inventory/records/${id}`, {
      method: 'DELETE'
    });
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error("Delete inventory item error:", err.message);
    res.status(500).json({ error: "Failed to delete item from PocketBase", details: err.message });
  }
});

// 3. Link or unlink an e-Menu product to a PocketBase inventory item
app.put("/api/admin/products/:id/inventory-link", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { id } = req.params;
  const { inventoryLink, shop } = req.body;
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    let updateOp = {};
    if (!inventoryLink || !inventoryLink.recordId) {
      // Unlink
      updateOp = { $unset: { inventoryLink: "" } };
    } else {
      updateOp = {
        $set: {
          inventoryLink: {
            recordId: String(inventoryLink.recordId).trim(),
            legacyId: String(inventoryLink.legacyId || '').trim(),
            itemName: String(inventoryLink.itemName || '').trim(),
            conversionFactor: Number(inventoryLink.conversionFactor) > 0 ? Number(inventoryLink.conversionFactor) : 1
          }
        }
      };
    }

    const result = await targetColl.updateOne({ _id: new ObjectId(id) }, updateOp);
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true, inventoryLink: updateOp.$set ? updateOp.$set.inventoryLink : null });
  } catch (err) {
    console.error("Update inventory link error:", err.message);
    res.status(500).json({ error: "Failed to update inventory link" });
  }
});

// 3a. Auto-match PocketBase inventory items with e-Menu products using normalized Arabic text
app.post("/api/admin/inventory/auto-match", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const shop = req.body.shop || "shop2";
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  try {
    // 1. Fetch PB items
    const pbRes = await pbFetch("/collections/inventory/records?perPage=250&sort=name");
    const pbItems = pbRes.items || [];

    // 2. Fetch e-Menu products
    const products = await targetColl.find({}).project({
      name: 1,
      category: 1,
      subCategory: 1,
      price_regular: 1,
      inventoryLink: 1
    }).toArray();

    // 3. Track existing links
    const alreadyLinkedPbIds = new Set();
    const alreadyLinkedProdIds = new Set();
    for (const p of products) {
      if (p.inventoryLink?.recordId) {
        alreadyLinkedPbIds.add(p.inventoryLink.recordId);
        alreadyLinkedProdIds.add(p._id.toString());
      }
    }

    const matches = [];
    const matchedPbInThisRun = new Set();
    const matchedProdInThisRun = new Set();

    // Pass 1: Exact normalized match
    for (const item of pbItems) {
      if (alreadyLinkedPbIds.has(item.id)) continue;
      const normItem = normalizeArabicText(item.name);
      if (!normItem) continue;

      for (const prod of products) {
        const prodIdStr = prod._id.toString();
        if (alreadyLinkedProdIds.has(prodIdStr) || matchedProdInThisRun.has(prodIdStr)) continue;

        const normProd = normalizeArabicText(prod.name);
        if (normItem === normProd) {
          matchedPbInThisRun.add(item.id);
          matchedProdInThisRun.add(prodIdStr);
          matches.push({
            pbRecordId: item.id,
            pbItemName: item.name,
            pbCategory: item.category || '',
            pbQuantity: typeof item.quantity === 'number' ? item.quantity : 0,
            pbLegacyId: item.legacy_id || '',
            productId: prodIdStr,
            productName: prod.name,
            productCategory: prod.category || '',
            confidence: 100,
            exact: true,
            conversionFactor: 1
          });
          break;
        }
      }
    }

    // Pass 2: High overlap partial match for remaining unlinked
    for (const item of pbItems) {
      if (alreadyLinkedPbIds.has(item.id) || matchedPbInThisRun.has(item.id)) continue;
      const normItem = normalizeArabicText(item.name);
      if (!normItem) continue;
      const itemWords = normItem.split(' ').filter(w => w.length > 1);
      if (itemWords.length === 0) continue;

      let bestProd = null;
      let bestScore = 0;

      for (const prod of products) {
        const prodIdStr = prod._id.toString();
        if (alreadyLinkedProdIds.has(prodIdStr) || matchedProdInThisRun.has(prodIdStr)) continue;

        const normProd = normalizeArabicText(prod.name);
        if (!normProd) continue;
        const prodWords = normProd.split(' ').filter(w => w.length > 1);

        if (normItem.includes(normProd) || normProd.includes(normItem)) {
          const score = 85;
          if (score > bestScore) {
            bestScore = score;
            bestProd = prod;
          }
        } else if (itemWords.length > 0 && prodWords.length > 0) {
          const common = itemWords.filter(w => prodWords.includes(w));
          const overlap = common.length / Math.max(itemWords.length, prodWords.length);
          const score = Math.round(overlap * 100);
          if (score >= 70 && score > bestScore) {
            bestScore = score;
            bestProd = prod;
          }
        }
      }

      if (bestProd && bestScore >= 70) {
        matchedPbInThisRun.add(item.id);
        matchedProdInThisRun.add(bestProd._id.toString());
        matches.push({
          pbRecordId: item.id,
          pbItemName: item.name,
          pbCategory: item.category || '',
          pbQuantity: typeof item.quantity === 'number' ? item.quantity : 0,
          pbLegacyId: item.legacy_id || '',
          productId: bestProd._id.toString(),
          productName: bestProd.name,
          productCategory: bestProd.category || '',
          confidence: bestScore,
          exact: false,
          conversionFactor: 1
        });
      }
    }

    res.json({
      success: true,
      totalPbItems: pbItems.length,
      totalProducts: products.length,
      alreadyLinkedCount: alreadyLinkedPbIds.size,
      matches: matches.sort((a, b) => b.confidence - a.confidence)
    });
  } catch (err) {
    console.error("Auto match inventory error:", err.message);
    res.status(500).json({ error: "Failed to auto-match inventory", details: err.message });
  }
});

// 3b. Batch-link matched products to PocketBase inventory items
app.post("/api/admin/inventory/batch-link", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { links, shop } = req.body;
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  if (!Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: "No links provided" });
  }

  try {
    const validLinks = links.filter(l => l && ObjectId.isValid(l.productId) && l.pbRecordId);
    if (validLinks.length === 0) {
      return res.status(400).json({ error: "No valid product/inventory link pairs provided" });
    }

    const bulkOps = validLinks.map(l => ({
      updateOne: {
        filter: { _id: new ObjectId(l.productId) },
        update: {
          $set: {
            inventoryLink: {
              recordId: String(l.pbRecordId).trim(),
              legacyId: String(l.pbLegacyId || l.legacyId || '').trim(),
              itemName: String(l.pbItemName || l.itemName || '').trim(),
              conversionFactor: Number(l.conversionFactor) > 0 ? Number(l.conversionFactor) : 1
            }
          }
        }
      }
    }));

    const result = await targetColl.bulkWrite(bulkOps);
    res.json({
      success: true,
      count: (result.modifiedCount || 0) + (result.upsertedCount || 0),
      totalSubmitted: validLinks.length
    });
  } catch (err) {
    console.error("Batch inventory link error:", err.message);
    res.status(500).json({ error: "Failed to batch link products", details: err.message });
  }
});

// 3b-2. Sync all Shop products to PocketBase, creating missing items with quantity 0
app.post("/api/admin/inventory/sync-all-products", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const shop = req.body.shop || "shop2";
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  try {
    const pbRes = await pbFetch("/collections/inventory/records?perPage=500");
    const pbItems = Array.isArray(pbRes.items) ? pbRes.items : [];

    let maxLegacyId = 0;
    for (const item of pbItems) {
      const num = parseInt(item.legacy_id, 10);
      if (!isNaN(num) && num > maxLegacyId) maxLegacyId = num;
    }

    const pbById = new Map();
    const pbByExactName = new Map();
    const pbByNormName = new Map();

    for (const item of pbItems) {
      pbById.set(item.id, item);
      pbByExactName.set(item.name.trim(), item);
      const norm = normalizeArabicText(item.name);
      if (norm && !pbByNormName.has(norm)) pbByNormName.set(norm, item);
    }

    const products = await targetColl.find({ hasStorage: { $ne: false } }).toArray();
    let alreadyLinkedCount = 0;
    let newlyMatchedCount = 0;
    let newlyCreatedCount = 0;

    for (const product of products) {
      const prodName = (product.name || '').trim();
      if (!prodName) continue;

      if (product.inventoryLink?.recordId && pbById.has(product.inventoryLink.recordId)) {
        alreadyLinkedCount++;
        continue;
      }

      let matchedPb = pbByExactName.get(prodName) || pbByNormName.get(normalizeArabicText(prodName));
      if (matchedPb) {
        const linkDoc = {
          recordId: matchedPb.id,
          legacyId: matchedPb.legacy_id || '',
          itemName: matchedPb.name,
          conversionFactor: 1
        };
        await targetColl.updateOne({ _id: product._id }, { $set: { inventoryLink: linkDoc } });
        newlyMatchedCount++;
        continue;
      }

      maxLegacyId++;
      const nextLegacyIdStr = maxLegacyId.toString();
      const pbPayload = {
        name: prodName,
        category: (product.category || 'عام').trim(),
        quantity: 0,
        min_stock: 0,
        legacy_id: nextLegacyIdStr,
        last_updated_legacy: new Date().toISOString()
      };

      const createdItem = await pbFetch('/collections/inventory/records', {
        method: 'POST',
        body: JSON.stringify(pbPayload)
      });

      pbById.set(createdItem.id, createdItem);
      pbByExactName.set(createdItem.name.trim(), createdItem);
      const norm = normalizeArabicText(createdItem.name);
      if (norm) pbByNormName.set(norm, createdItem);

      const linkDoc = {
        recordId: createdItem.id,
        legacyId: createdItem.legacy_id || nextLegacyIdStr,
        itemName: createdItem.name,
        conversionFactor: 1
      };
      await targetColl.updateOne({ _id: product._id }, { $set: { inventoryLink: linkDoc } });
      newlyCreatedCount++;
    }

    res.json({
      success: true,
      totalProducts: products.length,
      alreadyLinked: alreadyLinkedCount,
      newlyMatched: newlyMatchedCount,
      newlyCreated: newlyCreatedCount
    });
  } catch (err) {
    console.error("Sync all products to PB error:", err.message);
    res.status(500).json({ error: "Failed to sync products to PocketBase", details: err.message });
  }
});


// 3c. Link or unlink an inventory item directly from the inventory dashboard
app.put("/api/admin/inventory/link-item", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const { pbRecordId, productId, conversionFactor, shop } = req.body;
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  if (!pbRecordId) {
    return res.status(400).json({ error: "pbRecordId is required" });
  }

  try {
    // If productId is not supplied or empty, unlink any product currently referencing this PB item
    if (!productId) {
      const unlinkRes = await targetColl.updateMany(
        { "inventoryLink.recordId": String(pbRecordId).trim() },
        { $unset: { inventoryLink: "" } }
      );
      return res.json({ success: true, unlinked: true, modifiedCount: unlinkRes.modifiedCount });
    }

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Fetch PB item details from PocketBase to store accurate item name & legacy ID
    let pbItem = null;
    try {
      pbItem = await getInventoryStock(pbRecordId);
    } catch (e) {
      console.warn("Could not fetch PB item for link-item:", e.message);
    }

    // Unlink any other product currently tied to this PB record (to maintain 1:1 mapping)
    await targetColl.updateMany(
      { "inventoryLink.recordId": String(pbRecordId).trim(), _id: { $ne: new ObjectId(productId) } },
      { $unset: { inventoryLink: "" } }
    );

    const factor = Number(conversionFactor) > 0 ? Number(conversionFactor) : 1;
    const updateResult = await targetColl.updateOne(
      { _id: new ObjectId(productId) },
      {
        $set: {
          inventoryLink: {
            recordId: String(pbRecordId).trim(),
            legacyId: String(pbItem?.legacy_id || '').trim(),
            itemName: String(pbItem?.name || '').trim(),
            conversionFactor: factor
          }
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      success: true,
      linked: true,
      inventoryLink: {
        recordId: String(pbRecordId).trim(),
        legacyId: String(pbItem?.legacy_id || '').trim(),
        itemName: String(pbItem?.name || '').trim(),
        conversionFactor: factor
      }
    });
  } catch (err) {
    console.error("Link item error:", err.message);
    res.status(500).json({ error: "Failed to link item", details: err.message });
  }
});

// 3d. Lightweight list of products for shop (used in Quick Link modal autocomplete)
app.get("/api/admin/inventory/products-list", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  const shop = req.query.shop || "shop2";
  const targetColl = (shop === "shop1") ? productsCollection : productsCollection2;

  try {
    const products = await targetColl.find({})
      .project({ name: 1, category: 1, subCategory: 1, price_regular: 1, inventoryLink: 1 })
      .sort({ category: 1, name: 1 })
      .toArray();

    res.json({ success: true, products });
  } catch (err) {
    console.error("Fetch products for linking error:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// 4. List stock reservations with filters
app.get("/api/admin/inventory/reservations", checkMongoDB, checkStaffShop("shop2"), async (req, res) => {
  if (!stockReservationsCollection) {
    return res.status(503).json({ error: "Stock reservations collection not initialized" });
  }

  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.orderNumber) {
      query.orderNumber = Number(req.query.orderNumber);
    }

    let cursor = stockReservationsCollection.find(query).sort({ reservedAt: -1, createdAt: -1 });
    const parsedLimit = Number(req.query.limit);
    if (req.query.limit && Number.isFinite(parsedLimit) && parsedLimit > 0) {
      cursor = cursor.limit(parsedLimit);
    }
    const reservations = await cursor.toArray();

    res.json({ success: true, reservations });
  } catch (err) {
    console.error("Fetch reservations error:", err.message);
    res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

// 5. Trigger manual reconciliation sweep
app.post("/api/admin/inventory/reconcile", checkMongoDB, requireAdminShop("shop2"), async (req, res) => {
  try {
    await reconcileInventoryStock();
    res.json({ success: true, message: "تمت مواءمة ومطابقة المخزون بنجاح" });
  } catch (err) {
    console.error("Manual reconciliation error:", err.message);
    res.status(500).json({ error: "Failed to reconcile inventory", details: err.message });
  }
});

// 6. Overall inventory sync status & health check
app.get("/api/admin/inventory/status", checkMongoDB, checkStaffShop("shop2"), async (req, res) => {
  try {
    let pbConnected = false;
    let totalItems = 0;
    let pbError = null;

    try {
      const pbRes = await pbFetch("/collections/inventory/records?perPage=1");
      pbConnected = true;
      totalItems = pbRes.totalItems || (Array.isArray(pbRes.items) ? pbRes.items.length : 0);
    } catch (e) {
      pbError = e.message;
    }

    let activeReservationsCount = 0;
    if (stockReservationsCollection) {
      activeReservationsCount = await stockReservationsCollection.countDocuments({ status: "reserved" });
    }

    let linkedProductsCount = 0;
    if (productsCollection2) {
      linkedProductsCount = await productsCollection2.countDocuments({
        "inventoryLink.recordId": { $exists: true, $ne: null }
      });
    }

    res.json({
      success: true,
      pocketbase: {
        connected: pbConnected,
        url: POCKETBASE_URL,
        error: pbError,
        totalItems
      },
      reservations: {
        active: activeReservationsCount
      },
      linkedProducts: {
        shop2: linkedProductsCount
      }
    });
  } catch (err) {
    console.error("Inventory status check error:", err.message);
    res.status(500).json({ error: "Failed to check inventory status" });
  }
});

// Get all customers with details (Filtered accurately by rec_date / deliveryDate)
app.get("/api/admin/customers", checkMongoDB, checkStaff, async (req, res) => {
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

    // Aggregate stats by customer phone (canonicalized)
    const statsMap = {};
    const balanceMap = {};

    for (const order of filteredOrders) {
      const rawPhone = order.customerInfo && order.customerInfo.phone;
      if (!rawPhone) continue;
      const phone = formatCanonicalLibyanPhone(rawPhone);

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
      const phone = formatCanonicalLibyanPhone(fav.phone);
      if (!favsMap[phone]) favsMap[phone] = [];
      favsMap[phone].push(fav.productId.toString());
    }

    const customersWithDetails = [];
    const seenPhones = new Set();

    for (const cust of customers) {
      const phone = formatCanonicalLibyanPhone(cust.phone);
      if (seenPhones.has(phone)) {
        continue;
      }
      seenPhones.add(phone);

      const stats = statsMap[phone] || { totalSpent: 0, orderCount: 0 };
      const outstandingBalance = balanceMap[phone] || 0;
      const favorites = favsMap[phone] || [];
      
      customersWithDetails.push({
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
      });
    }

    res.json(customersWithDetails);
  } catch (err) {
    console.error("Fetch admin customers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Update customer details (with reference linkage preservation & password management)
app.put("/api/admin/customers/:id", checkMongoDB, checkStaff, async (req, res) => {
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
    const canonicalPhone = formatCanonicalLibyanPhone(phone);
    const oldVariants = getLibyanPhoneVariants(oldPhone);
    const newVariants = getLibyanPhoneVariants(canonicalPhone);
    const allVariants = [...new Set([...oldVariants, ...newVariants])];

    // Clean up any other customer documents matching newVariants to prevent duplicates
    const conflictingCusts = await customersCollection.find({
      _id: { $ne: new ObjectId(id) },
      phone: { $in: newVariants }
    }).toArray();

    if (conflictingCusts.length > 0) {
      const conflictIds = conflictingCusts.map(c => c._id);
      await customersCollection.deleteMany({ _id: { $in: conflictIds } });
    }

    const updateDoc = { 
      name: name.trim(), 
      phone: canonicalPhone, 
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

    // Cascade phone change across all historical variants to canonicalPhone
    await favoritesCollection.updateMany({ phone: { $in: allVariants } }, { $set: { phone: canonicalPhone } }).catch(() => {});
    await ordersCollection.updateMany({ "customerInfo.phone": { $in: allVariants } }, { $set: { "customerInfo.phone": canonicalPhone } }).catch(() => {});
    await ordersCollection2.updateMany({ "customerInfo.phone": { $in: allVariants } }, { $set: { "customerInfo.phone": canonicalPhone } }).catch(() => {});
    await paymentsCollection.updateMany({ customerPhone: { $in: allVariants } }, { $set: { customerPhone: canonicalPhone } }).catch(() => {});

    res.json({ success: true, name: updateDoc.name, phone: canonicalPhone });
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete customer and all their data (orders, favorites)
app.delete("/api/admin/customers/:id", checkMongoDB, checkStaff, async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const phone = customer.phone;

    // Remove customer profile from directory
    await customersCollection.deleteOne({ _id: new ObjectId(id) });

    // Clean up customer preferences (favorites), but preserve historical orders and payments for financial auditability
    if (phone) {
      const phoneVariants = getLibyanPhoneVariants(phone);
      await favoritesCollection.deleteMany({ phone: { $in: phoneVariants } }).catch(() => {});
    }

    res.json({ success: true, message: "تم حذف ملف العميل بنجاح مع الحفاظ على سجل الطلبات والمدفوعات." });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});


// Mark order as printed by admin
app.put("/api/admin/orders/:id/printed", checkMongoDB, checkStaff, async (req, res) => {
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
app.get("/api/admin/customers/:phone/balance", checkMongoDB, checkStaff, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : "shop1";
  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
  const { phone } = req.params;

  try {
    const phoneVariants = getLibyanPhoneVariants(phone);
    const unpaidOrders = await ordColl.find({
      $and: [
        {
          $or: [
            { "customerInfo.phone": { $in: phoneVariants } },
            { customerPhone: { $in: phoneVariants } }
          ]
        },
        { status: { $ne: "cancelled" } },
        {
          $or: [
            { paymentStatus: { $in: ["unpaid", "partial"] } },
            { paymentStatus: { $exists: false } }
          ]
        }
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
      customerPhone: { $in: phoneVariants },
      shop
    }).sort({ createdAt: -1 }).toArray();

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

// Get all customer orders for Admin A5 Statement & History
app.get("/api/admin/customers/:phone/orders", checkMongoDB, checkStaff, async (req, res) => {
  const shop = req.query.shop === "shop2" ? "shop2" : (req.query.shop === "all" ? "all" : "shop1");
  const { phone } = req.params;

  try {
    const uniquePhones = getLibyanPhoneVariants(phone);

    const phoneFilter = {
      $or: [
        { "customerInfo.phone": { $in: uniquePhones } },
        { customerPhone: { $in: uniquePhones } }
      ]
    };

    let orders = [];
    if (shop === "all") {
      const orders1 = await ordersCollection.find(phoneFilter).sort({ createdAt: -1 }).toArray();
      const orders2 = await ordersCollection2.find(phoneFilter).sort({ createdAt: -1 }).toArray();
      orders = [
        ...orders1.map(o => ({ ...o, shop: 'shop1' })),
        ...orders2.map(o => ({ ...o, shop: 'shop2' }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;
      orders = await ordColl.find(phoneFilter).sort({ createdAt: -1 }).toArray();
    }

    const normalizedOrders = orders.map(o => {
      const totalPrice = Number(o.totalPrice || o.total || 0);
      const isPaid = o.paymentStatus === 'paid';
      const paidAmount = Number(o.paidAmount || (isPaid ? totalPrice : 0));
      const remaining = o.remaining !== undefined ? Number(o.remaining) : Math.max(0, totalPrice - paidAmount);

      return {
        _id: o._id,
        orderNumber: o.orderNumber || null,
        totalPrice,
        paidAmount,
        remaining,
        paymentStatus: o.paymentStatus || (remaining <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')),
        createdAt: o.createdAt,
        deliveryDate: o.deliveryDate,
        status: o.status || 'pending',
        itemsSummary: (o.items || []).map(i => `${i.name || i.title || ''} (${i.quantity || 1})`).join('، '),
        notes: o.notes || '',
        shop: o.shop || shop
      };
    });

    res.json(normalizedOrders);
  } catch (err) {
    console.error("Fetch customer orders error:", err);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});


// Record a payment (FIFO distribution)
app.post("/api/admin/payments", checkMongoDB, checkStaff, async (req, res) => {
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
    // Fetch unpaid/partial orders sorted oldest first (FIFO) across all phone variants
    const phoneVariants = getLibyanPhoneVariants(customerPhone);
    let unpaidOrders = await ordColl.find({
      $and: [
        {
          $or: [
            { "customerInfo.phone": { $in: phoneVariants } },
            { customerPhone: { $in: phoneVariants } }
          ]
        },
        { status: { $ne: "cancelled" } },
        {
          $or: [
            { paymentStatus: { $in: ["unpaid", "partial"] } },
            { paymentStatus: { $exists: false } }
          ]
        }
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

    invalidateAnalyticsCache(shop);

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
app.post("/api/admin/migrate-unpaid-orders", checkMongoDB, requireGlobalAdmin, async (req, res) => {
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
app.get("/api/admin/payments", checkMongoDB, checkStaff, async (req, res) => {
  const { phone, shop: reqShop, limit: reqLimit } = req.query;
  const shop = reqShop === "shop2" ? "shop2" : "shop1";

  try {
    const query = { shop };
    if (phone && typeof phone === "string") {
      query.customerPhone = { $in: getLibyanPhoneVariants(phone) };
    }
    let cursor = paymentsCollection.find(query).sort({ createdAt: -1 });
    const parsedLimit = Number(reqLimit);
    if (reqLimit && Number.isFinite(parsedLimit) && parsedLimit > 0) {
      cursor = cursor.limit(parsedLimit);
    }
    const payments = await cursor.toArray();
    res.json(payments);
  } catch (err) {
    console.error("Fetch payments error:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Cancel / Reverse a payment
app.post("/api/admin/payments/:id/cancel", checkMongoDB, checkStaff, async (req, res) => {
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

    invalidateAnalyticsCache(shop);

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

    invalidateAnalyticsCache(shop);

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
app.get("/api/admin/payments/:id", checkMongoDB, checkStaff, async (req, res) => {
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
  const type = req.query.type || "orders";
  const period = req.query.period || "30d";
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  const ordColl = shop === "shop2" ? ordersCollection2 : ordersCollection;

  try {
    let dateFilter = {};
    const periodLabel = (startDate && endDate) ? `${startDate}_to_${endDate}` : period;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        dateFilter = {
          createdAt: {
            $gte: start,
            $lte: end
          }
        };
      }
    } else if (period === 'all') {
      dateFilter = {};
    } else {
      let days = 30;
      if (period === '1d') days = 1;
      else if (period === '7d') days = 7;

      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: cutoff } };
    }

    let csvContent = "";
    let fileName = `report_${type}_${periodLabel}.csv`;

    if (type === "orders") {
      const list = await ordColl.find(dateFilter).sort({ createdAt: -1 }).toArray();
      const headers = ['رقم الطلب', 'التاريخ', 'اسم العميل', 'رقم الهاتف', 'تاريخ التسليم', 'الإجمالي (د.ل)', 'طريقة التسعير', 'الحالة', 'المنتجات المطلوبة'];
      const rows = list.map(o => [
        o.orderNumber ? `#${o.orderNumber}` : (o._id ? o._id.toString() : ''),
        o.createdAt ? new Date(o.createdAt).toLocaleString('ar-LY') : '',
        o.customerInfo ? (o.customerInfo.name || '') : '',
        o.customerInfo ? (o.customerInfo.phone || '') : '',
        o.deliveryDate || '',
        o.totalPrice || 0,
        o.priceMode === 'bulk' ? 'جملة' : 'مفرد',
        o.status === 'received' ? 'تم الاستلام' : o.status === 'completed' ? 'مكتمل' : o.status === 'ready' ? 'جاهز للاستلام' : o.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار',
        Array.isArray(o.items) ? o.items.map(i => `${i.name} (x${i.quantity})`).join(' | ') : ''
      ]);
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_الطلبات_${shop}_${periodLabel}.csv`;

    } else if (type === "products") {
      const completedOrders = await ordColl.find({ ...dateFilter, status: { $in: ['received', 'completed'] } }).toArray();
      const salesMap = {};
      for (const order of completedOrders) {
        if (!Array.isArray(order.items)) continue;
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
          prodInfo ? (prodInfo.category || 'غير معروف') : 'غير معروف',
          prodInfo ? (prodInfo.subCategory || prodInfo.subcategory || '') : '',
          prodInfo ? (prodInfo.price_regular ?? prodInfo.price ?? '') : '',
          prodInfo ? (prodInfo.price_bulk ?? '') : '',
          Math.round(sale.quantity * 100) / 100,
          sale.revenue.toFixed(2)
        ]);
      }
      rows.sort((a, b) => Number(b[6]) - Number(a[6]));
      csvContent = arrayToCSV(headers, rows);
      fileName = `أداء_المنتجات_${shop}_${periodLabel}.csv`;

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
          Number(stats.totalSpent || 0).toFixed(2),
          favCount
        ];
      });
      rows.sort((a, b) => Number(b[5]) - Number(a[5]));
      csvContent = arrayToCSV(headers, rows);
      fileName = `تقرير_العملاء_${shop}_${periodLabel}.csv`;
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

    const canonicalPhone = formatCanonicalLibyanPhone(phone);
    const normalizedName = name.trim();

    // Check if phone already registered (flexible lookup across all formats)
    const existing = await findCustomerByPhone(phone);
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
              phone: canonicalPhone,
              password: password.trim(),
              passwordHash,
              lastActive: new Date()
            } 
          }
        );
        const token = generateCustomerToken(canonicalPhone);
        return res.json({
          success: true,
          token,
          customer: {
            name: existing.name || normalizedName,
            phone: canonicalPhone,
            hasPassword: true
          }
        });
      }
    }

    // New customer registration
    const passwordHash = hashCustomerPassword(password);
    const newCustomerDoc = {
      name: normalizedName,
      phone: canonicalPhone,
      password: password.trim(),
      passwordHash,
      createdAt: new Date(),
      lastActive: new Date()
    };

    await customersCollection.insertOne(newCustomerDoc);
    const token = generateCustomerToken(canonicalPhone);

    res.status(201).json({
      success: true,
      token,
      customer: {
        name: normalizedName,
        phone: canonicalPhone,
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

    // Find customer by any phone representation (091..., 091-..., +218..., 218..., etc.)
    const customer = await findCustomerByPhone(phone);

    if (!customer) {
      return res.status(404).json({ error: "رقم الهاتف غير مسجل، يرجى إنشاء حساب جديد" });
    }

    const canonicalPhone = formatCanonicalLibyanPhone(customer.phone || phone);

    // If customer has no password (legacy profile from guest ordering)
    if (!customer.passwordHash) {
      return res.json({
        success: true,
        requiresPasswordSetup: true,
        customer: {
          name: customer.name,
          phone: canonicalPhone,
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

    // Optionally update customer phone to canonical format
    if (customer.phone !== canonicalPhone) {
      await customersCollection.updateOne(
        { _id: customer._id },
        { $set: { phone: canonicalPhone, lastActive: new Date() } }
      ).catch(() => {});
    } else {
      await customersCollection.updateOne(
        { _id: customer._id },
        { $set: { lastActive: new Date() } }
      );
    }

    const token = generateCustomerToken(canonicalPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: canonicalPhone,
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

    // Find customer by any phone representation
    const customer = await findCustomerByPhone(phone);

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

    const canonicalPhone = formatCanonicalLibyanPhone(customer.phone || phone);
    const newHash = hashCustomerPassword(password);
    await customersCollection.updateOne(
      { _id: customer._id },
      { 
        $set: { 
          phone: canonicalPhone,
          password: password.trim(),
          passwordHash: newHash,
          lastActive: new Date()
        } 
      }
    );

    const token = generateCustomerToken(canonicalPhone);
    res.json({
      success: true,
      token,
      customer: {
        name: customer.name,
        phone: canonicalPhone,
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
    const customer = await findCustomerByPhone(phone);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({
      name: customer.name,
      phone: formatCanonicalLibyanPhone(customer.phone || phone),
      hasPassword: !!customer.passwordHash,
      createdAt: customer.createdAt
    });
  } catch (err) {
    console.error("Get customer profile error:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// Admin reset customer password
app.put("/api/admin/customers/:id/reset-password", checkMongoDB, checkStaff, async (req, res) => {
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


// Get customer balance for customer view (combines both shops, matches any phone format)
app.get("/api/customer/balance", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing phone parameter" });
    }

    const phoneVariants = getLibyanPhoneVariants(phone);

    // Query unpaid orders across both shops matching any phone format
    const unpaid1 = await ordersCollection.find({
      "customerInfo.phone": { $in: phoneVariants },
      status: { $ne: "cancelled" },
      $or: [
        { paymentStatus: { $in: ["unpaid", "partial"] } },
        { paymentStatus: { $exists: false } }
      ]
    }).toArray();

    const unpaid2 = await ordersCollection2.find({
      "customerInfo.phone": { $in: phoneVariants },
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
    const allCompleted1 = await ordersCollection.find({ "customerInfo.phone": { $in: phoneVariants }, status: { $in: ["ready", "received", "completed"] } }).toArray();
    const allCompleted2 = await ordersCollection2.find({ "customerInfo.phone": { $in: phoneVariants }, status: { $in: ["ready", "received", "completed"] } }).toArray();
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
    
    const canonicalPhone = formatCanonicalLibyanPhone(phone);
    const existing = await findCustomerByPhone(phone);
    
    if (existing) {
      await customersCollection.updateOne(
        { _id: existing._id },
        { 
          $set: { 
            name: name.trim(), 
            phone: canonicalPhone,
            lastActive: new Date() 
          } 
        }
      );
    } else {
      await customersCollection.updateOne(
        { phone: canonicalPhone },
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
    }
    
    const token = generateCustomerToken(canonicalPhone);
    res.json({ success: true, token });
  } catch (err) {
    console.error("Identify customer error:", err);
    res.status(500).json({ error: "Failed to identify customer" });
  }
});

app.post("/api/customer/favorites", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone, shop, favorites } = req.body;
    if (!phone || !shop || !Array.isArray(favorites) || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }
    
    const canonicalPhone = formatCanonicalLibyanPhone(phone);
    const phoneVariants = getLibyanPhoneVariants(phone);
    
    // Clear existing favorites for this shop and all phone variants
    await favoritesCollection.deleteMany({ phone: { $in: phoneVariants }, shop });
    
    // Insert new favorites under canonical phone
    if (favorites.length > 0) {
      const docs = favorites.map(id => ({
        phone: canonicalPhone,
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

app.get("/api/customer/favorites", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const phoneVariants = getLibyanPhoneVariants(phone);
    const favs = await favoritesCollection.find({ phone: { $in: phoneVariants } }).toArray();
    
    const shop1 = favs.filter(f => f.shop === 'shop1').map(f => f.productId.toString());
    const shop2 = favs.filter(f => f.shop === 'shop2').map(f => f.productId.toString());
    
    res.json({ shop1, shop2 });
  } catch (err) {
    console.error("Fetch favorites error:", err);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.get("/api/customer/orders", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: "Missing or invalid phone parameter" });
    }
    
    const phoneVariants = getLibyanPhoneVariants(phone);
    
    // Query both databases/collections matching any phone variant (full history by default)
    const parsedLimit = Number(req.query.limit);
    const hasCustomLimit = req.query.limit && Number.isFinite(parsedLimit) && parsedLimit > 0;
    let cursor1 = ordersCollection.find({ "customerInfo.phone": { $in: phoneVariants } }).sort({ createdAt: -1 });
    let cursor2 = ordersCollection2.find({ "customerInfo.phone": { $in: phoneVariants } }).sort({ createdAt: -1 });
    if (hasCustomLimit) {
      cursor1 = cursor1.limit(parsedLimit);
      cursor2 = cursor2.limit(parsedLimit);
    }
    const [orders1, orders2] = await Promise.all([cursor1.toArray(), cursor2.toArray()]);
    
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
app.put("/api/customer/orders/:id", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
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

    const phoneVariants = getLibyanPhoneVariants(phone);
    if (!phoneVariants.includes(order.customerInfo?.phone)) {
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
        piecesPerUnit: parsePiecesPerUnit(item.piecesPerUnit),
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
app.put("/api/customer/orders/:id/received", checkMongoDB, customerLimiter, checkCustomerAuth, async (req, res) => {
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
    const phoneVariants = getLibyanPhoneVariants(phone);
    if (!phoneVariants.includes(order.customerInfo?.phone)) {
      return res.status(403).json({ error: "Phone mismatch" });
    }
    if (order.status !== 'ready') {
      return res.status(400).json({ error: "Order is not in ready state" });
    }

    await ordColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'received', receivedAt: new Date() } }
    );

    invalidateAnalyticsCache(shop === 'shop2' ? 'shop2' : 'shop1');

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

// Server-Side Price Recalculation & Privilege Segregation Helper
const sanitizeAndCalculateOrder = async (rawItems, priceMode, targetProductsColl, isStaffPOS, body = {}) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const emptyErr = new Error("يجب أن يحتوي الطلب على صنف واحد على الأقل");
    emptyErr.statusCode = 400;
    throw emptyErr;
  }

  // Pre-fetch all products referenced in items
  const productIds = rawItems
    .map(i => i.productId)
    .filter(id => id && ObjectId.isValid(id))
    .map(id => new ObjectId(id));

  let dbProductsMap = new Map();
  if (productIds.length > 0) {
    const dbProducts = await targetProductsColl.find({ _id: { $in: productIds } }).toArray();
    dbProducts.forEach(p => dbProductsMap.set(p._id.toString(), p));
  }

  let computedTotal = 0;
  const sanitizedItems = rawItems.map(item => {
    const prodIdStr = item.productId ? item.productId.toString() : '';
    const dbProd = dbProductsMap.get(prodIdStr);

    if (!dbProd && !isStaffPOS) {
      const invalidItemErr = new Error("أحد الأصناف المطلوبة غير موجود أو لم يعد متاحاً");
      invalidItemErr.statusCode = 400;
      throw invalidItemErr;
    }

    const canFloat = isStaffPOS ? Boolean(item.allowFloat || dbProd?.allowFloat) : Boolean(dbProd?.allowFloat);
    const rawNumericQty = Number(item.quantity);
    const normalizedQty = Number.isFinite(rawNumericQty) && rawNumericQty > 0
      ? (canFloat ? rawNumericQty : Math.round(rawNumericQty))
      : 1;
    const qty = Math.max(canFloat ? 0.05 : 1, normalizedQty);
    let unitPrice = 0;

    if (dbProd) {
      if (isStaffPOS && typeof item.price === 'number' && !isNaN(item.price) && item.price >= 0) {
        // Staff POS can manually override prices or give line-item discounts
        unitPrice = Math.round(Number(item.price) * 100) / 100;
      } else {
        // Public orders strictly derive unit price from database catalog
        if (priceMode === 'bulk' && dbProd.price_bulk !== null && dbProd.price_bulk !== undefined && dbProd.price_bulk !== '') {
          unitPrice = Number(dbProd.price_bulk);
        } else if (dbProd.price_regular !== null && dbProd.price_regular !== undefined && dbProd.price_regular !== '') {
          unitPrice = Number(dbProd.price_regular);
        } else if (dbProd.price_bulk !== null && dbProd.price_bulk !== undefined && dbProd.price_bulk !== '') {
          unitPrice = Number(dbProd.price_bulk);
        } else {
          unitPrice = Number(dbProd.price || 0);
        }
      }
    } else {
      // Staff POS can enter custom off-menu items
      unitPrice = Math.max(0, Math.round(Number(item.price || 0) * 100) / 100);
    }

    unitPrice = Math.round(unitPrice * 100) / 100;
    computedTotal += unitPrice * qty;
    const resolvedPiecesPerUnit = dbProd ? parsePiecesPerUnit(dbProd.piecesPerUnit) : parsePiecesPerUnit(item.piecesPerUnit);

    return {
      productId: item.productId && ObjectId.isValid(item.productId) ? new ObjectId(item.productId) : null,
      name: dbProd ? dbProd.name : (item.name || 'صنف غير محدد'),
      price: unitPrice,
      quantity: Math.round(qty * 100) / 100,
      allowFloat: canFloat,
      piecesPerUnit: resolvedPiecesPerUnit,
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : ''
    };
  });

  computedTotal = Math.round(computedTotal * 100) / 100;

  // Strict Privilege Segregation for financial fields
  let paidAmount = 0;
  let paymentStatus = 'unpaid';
  let paymentMethod = '';
  let status = 'pending';

  if (isStaffPOS) {
    const rawPaid = Number(body.paidAmount) || 0;
    paidAmount = Math.round(rawPaid * 100) / 100;
    if (body.paymentStatus && ['paid', 'partial', 'unpaid'].includes(body.paymentStatus)) {
      paymentStatus = body.paymentStatus;
    } else {
      paymentStatus = paidAmount >= computedTotal && computedTotal > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
    }
    paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.slice(0, 50) : '';
    if (body.status && ['pending', 'ready', 'received', 'cancelled'].includes(body.status)) {
      status = body.status;
    }
  }

  return {
    items: sanitizedItems,
    totalPrice: computedTotal,
    paidAmount,
    paymentStatus,
    paymentMethod,
    status
  };
};

// ============ ORDER SUBMISSION APIs ============

app.post("/api/orders", checkMongoDB, publicOrderLimiter, async (req, res) => {
  try {
    const { customer, items, deliveryDate, notes, priceMode, force, bypassDuplicateCheck } = req.body || {};
    if (!customer || !customer.name || !customer.phone || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const canonicalPhone = formatCanonicalLibyanPhone(customer.phone);
    const phoneVariants = getLibyanPhoneVariants(customer.phone);
    const normalizedName = String(customer.name).trim();

    // Only grant staff POS privileges on Shop 1 if the staff member has access to Shop 1
    const isStaff = Boolean(req.staffUser && (req.staffUser.shopAccess === 'all' || req.staffUser.shopAccess === 'shop1'));
    const {
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      status: parsedStatus
    } = await sanitizeAndCalculateOrder(items, priceMode, productsCollection, isStaff, req.body);

    // 5-Minute Duplicate Order Prevention (Cooldown) — only authenticated POS staff may force-bypass
    const canBypassCooldown = isStaff && Boolean(force || bypassDuplicateCheck);
    if (!canBypassCooldown) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection.find({
        "customerInfo.phone": { $in: phoneVariants },
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(sanitizedItems, recent.items)) {
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

    // Upsert customer profile (preserve registered name, handle all phone formats)
    const existingCust = await findCustomerByPhone(customer.phone);
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    if (existingCust) {
      await customersCollection.updateOne(
        { _id: existingCust._id },
        { 
          $set: { 
            name: finalCustName, 
            phone: canonicalPhone,
            lastActive: new Date() 
          } 
        }
      );
    } else {
      await customersCollection.updateOne(
        { phone: canonicalPhone },
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
    }

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
      customerInfo: {
        name: normalizedName,
        phone: canonicalPhone
      },
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: parsedStatus,
      ...(parsedStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection.insertOne(orderDoc);
    invalidateAnalyticsCache("shop1");
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    if (err && err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Save order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.post("/api/shop2/orders", checkMongoDB, publicOrderLimiter, async (req, res) => {
  try {
    const { customer, items, deliveryDate, notes, priceMode, force, bypassDuplicateCheck } = req.body || {};
    if (!customer || !customer.name || !customer.phone || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing order details" });
    }

    const canonicalPhone = formatCanonicalLibyanPhone(customer.phone);
    const phoneVariants = getLibyanPhoneVariants(customer.phone);
    const normalizedName = String(customer.name).trim();

    // Only grant staff POS privileges on Shop 2 if the staff member has access to Shop 2
    const isStaff = Boolean(req.staffUser && (req.staffUser.shopAccess === 'all' || req.staffUser.shopAccess === 'shop2'));
    const {
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      status: parsedStatus
    } = await sanitizeAndCalculateOrder(items, priceMode, productsCollection2, isStaff, req.body);

    // 5-Minute Duplicate Order Prevention (Cooldown) — only authenticated POS staff may force-bypass
    const canBypassCooldown = isStaff && Boolean(force || bypassDuplicateCheck);
    if (!canBypassCooldown) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOrders = await ordersCollection2.find({
        "customerInfo.phone": { $in: phoneVariants },
        status: { $ne: "cancelled" },
        createdAt: { $gte: fiveMinutesAgo }
      }).sort({ createdAt: -1 }).toArray();

      for (const recent of recentOrders) {
        if (Math.abs((recent.totalPrice || 0) - parsedTotal) < 0.05 && areOrderItemsEqual(sanitizedItems, recent.items)) {
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

    // Upsert customer profile (preserve registered name, handle all phone formats)
    const existingCust = await findCustomerByPhone(customer.phone);
    const finalCustName = (existingCust && existingCust.name) ? existingCust.name : normalizedName;

    if (existingCust) {
      await customersCollection.updateOne(
        { _id: existingCust._id },
        { 
          $set: { 
            name: finalCustName, 
            phone: canonicalPhone,
            lastActive: new Date() 
          } 
        }
      );
    } else {
      await customersCollection.updateOne(
        { phone: canonicalPhone },
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
    }

    const nextOrderNumber = await getNextOrderNumber();
    const orderDoc = {
      orderNumber: nextOrderNumber,
      customerInfo: {
        name: normalizedName,
        phone: canonicalPhone
      },
      items: sanitizedItems,
      totalPrice: parsedTotal,
      paidAmount: parsedPaid,
      paymentStatus: parsedPaymentStatus,
      paymentMethod: parsedPaymentMethod,
      deliveryDate: deliveryDate || '',
      notes: notes || '',
      priceMode: priceMode || 'regular',
      status: parsedStatus,
      ...(parsedStatus === 'cancelled' ? { cancelledAt: new Date() } : {}),
      printed: false,
      whatsappSent: true,
      createdAt: new Date()
    };
    
    const result = await ordersCollection2.insertOne(orderDoc);

    // Inventory reservation hook (Shop 2, non-blocking)
    if (orderDoc.status !== 'cancelled') {
      try {
        await reserveInventoryForOrder({ ...orderDoc, _id: result.insertedId });
      } catch (invErr) {
        console.error("[Inventory] Shop 2 order reservation error (non-blocking):", invErr.message);
      }
    }

    invalidateAnalyticsCache("shop2");

    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId, 
      orderNumber: nextOrderNumber,
      order: { ...orderDoc, _id: result.insertedId }
    });
  } catch (err) {
    if (err && err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
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

app.get(["/apple-touch-icon.png", "/app/apple-touch-icon.png", "/apple-touch-icon-shop1.png", "/app/apple-touch-icon-shop1.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-shop1.png"));
});

app.get(["/apple-touch-icon-shop2.png", "/app/apple-touch-icon-shop2.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-shop2.png"));
});

app.get(["/apple-touch-icon-admin.png", "/app/apple-touch-icon-admin.png"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "apple-touch-icon-admin.png"));
});

app.get(["/manifest.json", "/app/manifest.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest.json"));
});

app.get(["/manifest-shop2.json", "/app/manifest-shop2.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest-shop2.json"));
});

app.get(["/manifest-admin.json", "/app/manifest-admin.json"], (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "public", "manifest-admin.json"));
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
app.post("/api/admin/marketing-carousel", checkMongoDB, requireAdmin, upload.single('img'), uploadErrorHandler, enforceParsedBodyShopScope, async (req, res) => {
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
app.put("/api/admin/marketing-carousel/:id", checkMongoDB, requireAdmin, upload.single('img'), uploadErrorHandler, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, link } = req.body;
  
  if (req.fileValidationError) {
    return res.status(400).json({ error: `Image upload failed: ${req.fileValidationError}` });
  }

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid carousel ID" });
    }
    const item = await carouselCollection.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: "Carousel item not found" });
    }
    if (req.staffUser.shopAccess !== 'all' && (item.shop || 'shop1') !== req.staffUser.shopAccess) {
      return res.status(403).json({ error: "ليس لديك صلاحية لتعديل بنرات متجر آخر" });
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
app.delete("/api/admin/marketing-carousel/:id", checkMongoDB, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid carousel ID" });
    }
    const existing = await carouselCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: "Item not found" });
    }
    if (req.staffUser.shopAccess !== 'all' && (existing.shop || 'shop1') !== req.staffUser.shopAccess) {
      return res.status(403).json({ error: "ليس لديك صلاحية لحذف بنرات متجر آخر" });
    }
    await carouselCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete carousel item error:", err);
    res.status(500).json({ error: "Failed to delete carousel item" });
  }
});


// ============ EMPLOYEES, JOBS, CHEF COEFFICIENTS & HR PAYROLL TRANSACTIONS ============

const buildEmployeeBranchScopeQuery = (req, explicitBranch = null) => {
  const userAccess = req.staffUser?.shopAccess || 'all';
  if (userAccess === 'shop1' || userAccess === 'shop2') {
    return { branch: { $in: [userAccess, 'all'] } };
  }
  if (explicitBranch === 'shop1' || explicitBranch === 'shop2') {
    return { branch: { $in: [explicitBranch, 'all'] } };
  }
  return {};
};

const isEmployeeInUserScope = (emp, req) => {
  if (!emp) return false;
  const userAccess = req.staffUser?.shopAccess || 'all';
  if (userAccess === 'all') return true;
  return emp.branch === userAccess || emp.branch === 'all';
};

// 1. Jobs CRUD
app.get("/api/admin/employee-jobs", checkMongoDB, checkStaff, async (req, res) => {
  try {
    const [jobs, empList] = await Promise.all([
      employeeJobsCollection.find().sort({ name: 1 }).toArray(),
      employeesCollection.find({}, { projection: { jobId: 1 } }).toArray()
    ]);
    const countMap = {};
    for (const e of empList) {
      if (e.jobId) {
        const k = String(e.jobId);
        countMap[k] = (countMap[k] || 0) + 1;
      }
    }
    const enriched = jobs.map(j => ({
      ...j,
      employeeCount: countMap[String(j._id)] || 0
    }));
    res.json(enriched);
  } catch (err) {
    console.error("Fetch employee jobs error:", err);
    res.status(500).json({ error: "فشل في جلب قائمة الوظائف" });
  }
});

app.post("/api/admin/employee-jobs", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, payType, description } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: "اسم الوظيفة مطلوب" });
    }
    if (!['fixed', 'production'].includes(payType)) {
      return res.status(400).json({ error: "نوع احتساب الراتب غير صالح" });
    }
    const existing = await employeeJobsCollection.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ error: "يوجد وظيفة بنفس هذا الاسم مسبقاً" });
    }
    const now = new Date();
    const doc = {
      name: cleanName,
      payType,
      description: typeof description === 'string' ? description.trim() : '',
      createdAt: now,
      updatedAt: now
    };
    const result = await employeeJobsCollection.insertOne(doc);
    res.status(201).json({ success: true, job: { _id: result.insertedId, ...doc, employeeCount: 0 } });
  } catch (err) {
    console.error("Create employee job error:", err);
    res.status(500).json({ error: "فشل في إضافة الوظيفة" });
  }
});

app.put("/api/admin/employee-jobs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الوظيفة غير صالح" });
    }
    const { name, payType, description } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: "اسم الوظيفة مطلوب" });
    }
    if (!['fixed', 'production'].includes(payType)) {
      return res.status(400).json({ error: "نوع احتساب الراتب غير صالح" });
    }
    const jobObjId = new ObjectId(id);
    const conflict = await employeeJobsCollection.findOne({ name: cleanName, _id: { $ne: jobObjId } });
    if (conflict) {
      return res.status(400).json({ error: "يوجد وظيفة أخرى بنفس هذا الاسم" });
    }
    const now = new Date();
    const upd = await employeeJobsCollection.updateOne(
      { _id: jobObjId },
      {
        $set: {
          name: cleanName,
          payType,
          description: typeof description === 'string' ? description.trim() : '',
          updatedAt: now
        }
      }
    );
    if (upd.matchedCount === 0) {
      return res.status(404).json({ error: "الوظيفة غير موجودة" });
    }

    // Cascade job metadata changes to assigned employees safely
    const empCascadeSet = { jobName: cleanName, payType, updatedAt: now };
    if (payType === 'production') {
      empCascadeSet.salary = null;
    } else {
      empCascadeSet.linkedChefs = [];
    }
    await employeesCollection.updateMany(
      { jobId: jobObjId },
      { $set: empCascadeSet }
    );
    await employeeTransactionsCollection.updateMany(
      { jobId: jobObjId },
      { $set: { employeeJobName: cleanName } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update employee job error:", err);
    res.status(500).json({ error: "فشل في تحديث بيانات الوظيفة" });
  }
});

app.delete("/api/admin/employee-jobs/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الوظيفة غير صالح" });
    }
    const jobObjId = new ObjectId(id);
    const assignedCount = await employeesCollection.countDocuments({ jobId: jobObjId });
    if (assignedCount > 0) {
      return res.status(400).json({
        error: `لا يمكن حذف هذه الوظيفة لوجود ${assignedCount} موظف مسجل عليها حالياً`
      });
    }
    const del = await employeeJobsCollection.deleteOne({ _id: jobObjId });
    if (del.deletedCount === 0) {
      return res.status(404).json({ error: "الوظيفة غير موجودة" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete employee job error:", err);
    res.status(500).json({ error: "فشل في حذف الوظيفة" });
  }
});

// 2. Available Production Chefs for Linking to Producer Employees (Admin Only)
app.get("/api/admin/employees/chefs-options", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const access = req.staffUser?.shopAccess || 'all';
    const [s1, s2] = await Promise.all([
      (access === 'all' || access === 'shop1') ? chefsCollection.find().sort({ name: 1 }).toArray() : Promise.resolve([]),
      (access === 'all' || access === 'shop2') ? chefsCollection2.find().sort({ name: 1 }).toArray() : Promise.resolve([])
    ]);
    res.json({
      shop1: s1.map(c => ({ shop: 'shop1', chefId: String(c._id), chefName: c.name, phone: c.phone || '' })),
      shop2: s2.map(c => ({ shop: 'shop2', chefId: String(c._id), chefName: c.name, phone: c.phone || '' }))
    });
  } catch (err) {
    console.error("Fetch chef link options error:", err);
    res.status(500).json({ error: "فشل في جلب قائمة الشيفات" });
  }
});

// 3. Batch Update Per-Product Chef Coefficients (Admin Only)
app.put("/api/admin/employees/chef-coefficients", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "لم يتم إرسال أي تعديلات للمعاملات" });
    }
    const userAccess = req.staffUser?.shopAccess || 'all';
    const opsShop1 = [];
    const opsShop2 = [];

    for (const u of updates) {
      if (!u || !u.productId || !ObjectId.isValid(u.productId)) continue;
      const targetShop = u.shop === 'shop2' ? 'shop2' : 'shop1';
      if (userAccess !== 'all' && userAccess !== targetShop) {
        return res.status(403).json({ error: "ليس لديك صلاحية لتعديل معاملات أصناف هذا الفرع" });
      }
      const numVal = Number(u.chefCoefficient);
      const cleanCoeff = (Number.isFinite(numVal) && numVal > 0)
        ? Math.round(numVal * 10000) / 10000
        : 0;
      const op = {
        updateOne: {
          filter: { _id: new ObjectId(u.productId) },
          update: { $set: { chefCoefficient: cleanCoeff } }
        }
      };
      if (targetShop === 'shop2') opsShop2.push(op);
      else opsShop1.push(op);
    }

    if (opsShop1.length > 0) await productsCollection.bulkWrite(opsShop1);
    if (opsShop2.length > 0) await productsCollection2.bulkWrite(opsShop2);

    res.json({ success: true, updatedCount: opsShop1.length + opsShop2.length });
  } catch (err) {
    console.error("Update chef coefficients error:", err);
    res.status(500).json({ error: "فشل في حفظ معاملات الأصناف" });
  }
});

// 4. Monthly Employee & Payroll Summary (Admin sees full financial payroll; Cashier sees branch list + adjustments only)
app.get("/api/admin/employees/summary", checkMongoDB, checkStaff, async (req, res) => {
  try {
    const rawMonth = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const defaultMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
    const monthKey = /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : defaultMonth;
    const requestedBranch = req.query.branch === 'shop1' ? 'shop1' : (req.query.branch === 'shop2' ? 'shop2' : 'all');
    const isAdmin = req.staffUser?.role === 'admin';

    const empFilter = buildEmployeeBranchScopeQuery(req, requestedBranch);
    const txScopeFilter = buildEmployeeBranchScopeQuery(req, requestedBranch);

    const [employees, monthTxs] = await Promise.all([
      employeesCollection.find(empFilter).sort({ name: 1 }).toArray(),
      employeeTransactionsCollection.find({ ...txScopeFilter, monthKey }).sort({ date: -1, createdAt: -1 }).toArray()
    ]);

    // Aggregate monthly bonuses / borrowings / penalties by employeeId
    const txByEmp = {};
    for (const tx of monthTxs) {
      const eid = String(tx.employeeId);
      if (!txByEmp[eid]) {
        txByEmp[eid] = { bonusesTotal: 0, borrowingsTotal: 0, penaltiesTotal: 0, txCount: 0 };
      }
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'bonus') txByEmp[eid].bonusesTotal += amt;
      else if (tx.type === 'borrowing') txByEmp[eid].borrowingsTotal += amt;
      else if (tx.type === 'penalty') txByEmp[eid].penaltiesTotal += amt;
      txByEmp[eid].txCount += 1;
    }

    // For Cashiers: strip all sensitive salary / production earnings / coefficient details
    if (!isAdmin) {
      const safeEmployees = employees.map(e => {
        const eid = String(e._id);
        const agg = txByEmp[eid] || { bonusesTotal: 0, borrowingsTotal: 0, penaltiesTotal: 0, txCount: 0 };
        return {
          _id: e._id,
          name: e.name,
          phone: e.phone || '',
          branch: e.branch || 'shop1',
          jobId: e.jobId,
          jobName: e.jobName || '',
          payType: e.payType || 'fixed',
          active: e.active !== false,
          notes: e.notes || '',
          bonusesTotal: Math.round(agg.bonusesTotal * 100) / 100,
          borrowingsTotal: Math.round(agg.borrowingsTotal * 100) / 100,
          penaltiesTotal: Math.round(agg.penaltiesTotal * 100) / 100,
          txCount: agg.txCount
        };
      });
      return res.json({ success: true, monthKey, isAdmin: false, employees: safeEmployees });
    }

    // Admin payroll calculation: aggregate monthly production sales per chef per product
    const hasProductionStaff = employees.some(e => e.payType === 'production');
    const chefProductMetrics = {}; // key "shop:chefId" -> Map(productId -> { shop, productId, productName, category, soldQty, totalSales, chefCoefficient, chefEarnings })

    if (hasProductionStaff) {
      const monthStart = `${monthKey}-01`;
      const monthEnd = `${monthKey}-31`;
      const [prods1, prods2, ords1, ords2] = await Promise.all([
        productsCollection.find().toArray(),
        productsCollection2.find().toArray(),
        ordersCollection.find({ status: { $ne: "cancelled" } }).toArray(),
        ordersCollection2.find({ status: { $ne: "cancelled" } }).toArray()
      ]);

      const initShopCatalog = (shopKey, prodsList) => {
        const prodMap = new Map();
        for (const p of prodsList) {
          const pid = String(p._id);
          const coeff = Number(p.chefCoefficient) || 0;
          const chefIdStr = p.chefId ? String(p.chefId) : '';
          prodMap.set(pid, {
            productId: pid,
            name: p.name || '',
            category: p.category || '',
            chefId: chefIdStr,
            chefName: p.chefName || '',
            chefCoefficient: coeff
          });
          if (chefIdStr) {
            const cKey = `${shopKey}:${chefIdStr}`;
            if (!chefProductMetrics[cKey]) chefProductMetrics[cKey] = new Map();
            chefProductMetrics[cKey].set(pid, {
              shop: shopKey,
              productId: pid,
              productName: p.name || '',
              category: p.category || '',
              chefId: chefIdStr,
              chefName: p.chefName || '',
              soldQty: 0,
              totalSales: 0,
              chefCoefficient: coeff,
              chefEarnings: 0
            });
          }
        }
        return prodMap;
      };

      const prodMap1 = initShopCatalog('shop1', prods1);
      const prodMap2 = initShopCatalog('shop2', prods2);

      const processOrders = (shopKey, ordList, prodMap) => {
        for (const order of ordList) {
          const effDate = getOrderEffectiveDateStr(order);
          if (!effDate || effDate < monthStart || effDate > monthEnd) continue;
          const items = Array.isArray(order.items) ? order.items : [];
          for (const item of items) {
            if (!item) continue;
            const pid = (item.productId || item._id || '').toString();
            const pInfo = prodMap.get(pid);
            if (!pInfo || !pInfo.chefId) continue;
            const qty = Number(item.quantity) || 0;
            const itemRev = (Number(item.price) || 0) * qty;
            const cKey = `${shopKey}:${pInfo.chefId}`;
            const targetMap = chefProductMetrics[cKey];
            if (targetMap && targetMap.has(pid)) {
              const rec = targetMap.get(pid);
              rec.soldQty += qty;
              rec.totalSales += itemRev;
            }
          }
        }
      };

      processOrders('shop1', ords1, prodMap1);
      processOrders('shop2', ords2, prodMap2);
    }

    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
    let totalFixedSalaries = 0;
    let totalProductionPay = 0;
    let totalBonuses = 0;
    let totalBorrowings = 0;
    let totalPenalties = 0;
    let totalNetPay = 0;
    let activeCount = 0;

    const fullEmployees = employees.map(e => {
      const eid = String(e._id);
      const agg = txByEmp[eid] || { bonusesTotal: 0, borrowingsTotal: 0, penaltiesTotal: 0, txCount: 0 };
      const bonusesTotal = round2(agg.bonusesTotal);
      const borrowingsTotal = round2(agg.borrowingsTotal);
      const penaltiesTotal = round2(agg.penaltiesTotal);
      const isProduction = e.payType === 'production';

      let baseSalary = isProduction ? null : round2(e.salary);
      let productionTotalQty = 0;
      let productionTotalSales = 0;
      let productionGrossPay = 0;
      const productBreakdown = [];

      if (isProduction) {
        const seenProds = new Set();
        const links = Array.isArray(e.linkedChefs) ? e.linkedChefs : [];
        for (const link of links) {
          if (!link || !link.chefId) continue;
          const shopKey = link.shop === 'shop2' ? 'shop2' : 'shop1';
          const cKey = `${shopKey}:${String(link.chefId)}`;
          const metricMap = chefProductMetrics[cKey];
          if (!metricMap) continue;
          for (const rec of metricMap.values()) {
            const uniqueKey = `${rec.shop}:${rec.productId}`;
            if (seenProds.has(uniqueKey)) continue;
            seenProds.add(uniqueKey);
            const qtyRounded = round2(rec.soldQty);
            const salesRounded = round2(rec.totalSales);
            const unitRate = Math.max(0, Number(rec.chefCoefficient) || 0);
            const earningsRounded = round2(qtyRounded * unitRate);
            productionTotalQty += qtyRounded;
            productionTotalSales += salesRounded;
            productionGrossPay += earningsRounded;
            productBreakdown.push({
              ...rec,
              soldQty: qtyRounded,
              totalSales: salesRounded,
              chefEarnings: earningsRounded
            });
          }
        }
        productBreakdown.sort((a, b) => b.soldQty - a.soldQty || b.totalSales - a.totalSales || a.productName.localeCompare(b.productName, 'ar'));
        productionTotalQty = round2(productionTotalQty);
        productionTotalSales = round2(productionTotalSales);
        productionGrossPay = round2(productionGrossPay);
      }

      const grossPay = isProduction ? productionGrossPay : (baseSalary || 0);
      const netPay = round2(grossPay + bonusesTotal - borrowingsTotal - penaltiesTotal);

      if (e.active !== false) {
        activeCount += 1;
        if (isProduction) totalProductionPay += productionGrossPay;
        else totalFixedSalaries += (baseSalary || 0);
        totalBonuses += bonusesTotal;
        totalBorrowings += borrowingsTotal;
        totalPenalties += penaltiesTotal;
        totalNetPay += netPay;
      }

      return {
        _id: e._id,
        name: e.name,
        phone: e.phone || '',
        branch: e.branch || 'shop1',
        jobId: e.jobId,
        jobName: e.jobName || '',
        payType: e.payType || 'fixed',
        salary: baseSalary,
        linkedChefs: isProduction ? (e.linkedChefs || []) : [],
        active: e.active !== false,
        notes: e.notes || '',
        productionTotalQty,
        productionTotalSales,
        productionGrossPay,
        productBreakdown,
        bonusesTotal,
        borrowingsTotal,
        penaltiesTotal,
        deductionsTotal: round2(borrowingsTotal + penaltiesTotal),
        txCount: agg.txCount,
        netPay
      };
    });

    res.json({
      success: true,
      monthKey,
      isAdmin: true,
      employees: fullEmployees,
      kpis: {
        totalEmployees: fullEmployees.length,
        activeCount,
        totalFixedSalaries: round2(totalFixedSalaries),
        totalProductionPay: round2(totalProductionPay),
        totalBonuses: round2(totalBonuses),
        totalBorrowings: round2(totalBorrowings),
        totalPenalties: round2(totalPenalties),
        totalDeductions: round2(totalBorrowings + totalPenalties),
        totalNetPay: round2(totalNetPay)
      }
    });
  } catch (err) {
    console.error("Fetch employees summary error:", err);
    res.status(500).json({ error: "فشل في تحميل بيانات مسير الموظفين" });
  }
});

// 5. Employees CRUD (Admin Only)
app.post("/api/admin/employees", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { name, phone, branch, jobId, salary, linkedChefs, active, notes } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: "اسم الموظف مطلوب" });
    }
    if (!jobId || !ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "يرجى اختيار الوظيفة" });
    }
    const job = await employeeJobsCollection.findOne({ _id: new ObjectId(jobId) });
    if (!job) {
      return res.status(404).json({ error: "الوظيفة المختارة غير موجودة" });
    }

    const userAccess = req.staffUser?.shopAccess || 'all';
    let resolvedBranch = ['shop1', 'shop2', 'all'].includes(branch) ? branch : 'shop1';
    if (userAccess !== 'all') {
      resolvedBranch = userAccess;
    }

    const cleanPhone = phone ? formatCanonicalLibyanPhone(phone) : '';
    const isProduction = job.payType === 'production';
    const resolvedSalary = isProduction ? null : Math.max(0, Math.round((Number(salary) || 0) * 100) / 100);
    const resolvedLinks = isProduction && Array.isArray(linkedChefs)
      ? linkedChefs
          .filter(c => c && c.chefId && (userAccess === 'all' || c.shop === userAccess))
          .map(c => ({
            shop: c.shop === 'shop2' ? 'shop2' : 'shop1',
            chefId: String(c.chefId),
            chefName: String(c.chefName || '').trim()
          }))
      : [];

    const now = new Date();
    const doc = {
      name: cleanName,
      phone: cleanPhone,
      branch: resolvedBranch,
      jobId: job._id,
      jobName: job.name,
      payType: job.payType,
      salary: resolvedSalary,
      linkedChefs: resolvedLinks,
      active: active !== false,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
      createdAt: now,
      updatedAt: now
    };
    const result = await employeesCollection.insertOne(doc);
    res.status(201).json({ success: true, employee: { _id: result.insertedId, ...doc } });
  } catch (err) {
    console.error("Create employee error:", err);
    res.status(500).json({ error: "فشل في إضافة الموظف" });
  }
});

app.put("/api/admin/employees/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الموظف غير صالح" });
    }
    const existing = await employeesCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: "الموظف غير موجود" });
    }
    if (!isEmployeeInUserScope(existing, req)) {
      return res.status(403).json({ error: "ليس لديك صلاحية لتعديل موظف في فرع آخر" });
    }

    const { name, phone, branch, jobId, salary, linkedChefs, active, notes } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: "اسم الموظف مطلوب" });
    }
    if (!jobId || !ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: "يرجى اختيار الوظيفة" });
    }
    const job = await employeeJobsCollection.findOne({ _id: new ObjectId(jobId) });
    if (!job) {
      return res.status(404).json({ error: "الوظيفة المختارة غير موجودة" });
    }

    const userAccess = req.staffUser?.shopAccess || 'all';
    let resolvedBranch = ['shop1', 'shop2', 'all'].includes(branch) ? branch : (existing.branch || 'shop1');
    if (userAccess !== 'all') {
      resolvedBranch = userAccess;
    }

    const cleanPhone = phone ? formatCanonicalLibyanPhone(phone) : '';
    const isProduction = job.payType === 'production';
    const resolvedSalary = isProduction ? null : Math.max(0, Math.round((Number(salary) || 0) * 100) / 100);
    const resolvedLinks = isProduction && Array.isArray(linkedChefs)
      ? linkedChefs
          .filter(c => c && c.chefId && (userAccess === 'all' || c.shop === userAccess))
          .map(c => ({
            shop: c.shop === 'shop2' ? 'shop2' : 'shop1',
            chefId: String(c.chefId),
            chefName: String(c.chefName || '').trim()
          }))
      : [];

    const now = new Date();
    const updateSet = {
      name: cleanName,
      phone: cleanPhone,
      branch: resolvedBranch,
      jobId: job._id,
      jobName: job.name,
      payType: job.payType,
      salary: resolvedSalary,
      linkedChefs: resolvedLinks,
      active: active !== false,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
      updatedAt: now
    };
    await employeesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateSet });

    // Keep cached employee labels aligned in transaction ledger
    await employeeTransactionsCollection.updateMany(
      { employeeId: new ObjectId(id) },
      { $set: { employeeName: cleanName, employeePhone: cleanPhone, employeeJobName: job.name, branch: resolvedBranch } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Update employee error:", err);
    res.status(500).json({ error: "فشل في تحديث بيانات الموظف" });
  }
});

app.delete("/api/admin/employees/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف الموظف غير صالح" });
    }
    const existing = await employeesCollection.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return res.status(404).json({ error: "الموظف غير موجود" });
    }
    if (!isEmployeeInUserScope(existing, req)) {
      return res.status(403).json({ error: "ليس لديك صلاحية لحذف موظف في فرع آخر" });
    }
    await employeesCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ error: "فشل في حذف الموظف" });
  }
});

// 6. Employee Transactions (Bonuses, Borrowings & Penalties with mandatory Reason & Receipt Re-access)
app.get("/api/admin/employees/transactions", checkMongoDB, checkStaff, async (req, res) => {
  try {
    const { month, employeeId, type, branch, q } = req.query;
    const requestedBranch = branch === 'shop1' ? 'shop1' : (branch === 'shop2' ? 'shop2' : 'all');
    const query = { ...buildEmployeeBranchScopeQuery(req, requestedBranch) };

    if (month && month !== 'all' && /^\d{4}-\d{2}$/.test(month)) {
      query.monthKey = month;
    }
    if (employeeId && ObjectId.isValid(employeeId)) {
      query.employeeId = new ObjectId(employeeId);
    }
    if (type && ['bonus', 'borrowing', 'penalty'].includes(type)) {
      query.type = type;
    }

    let list = await employeeTransactionsCollection.find(query).sort({ date: -1, createdAt: -1 }).toArray();
    if (q && typeof q === 'string' && q.trim()) {
      const term = q.trim().toLowerCase().replace(/^#?emp-?/i, '');
      list = list.filter(tx => {
        const txNumStr = String(tx.txNumber || '');
        const eName = (tx.employeeName || '').toLowerCase();
        const reasonStr = (tx.reason || '').toLowerCase();
        const recName = (tx.recordedBy?.name || '').toLowerCase();
        return txNumStr.includes(term) || eName.includes(term) || reasonStr.includes(term) || recName.includes(term);
      });
    }

    res.json({ success: true, transactions: list });
  } catch (err) {
    console.error("Fetch employee transactions error:", err);
    res.status(500).json({ error: "فشل في جلب سجل عمليات الموظفين" });
  }
});

app.post("/api/admin/employees/transactions", checkMongoDB, checkStaff, async (req, res) => {
  try {
    const { employeeId, type, amount, reason, date } = req.body || {};
    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return res.status(400).json({ error: "يرجى اختيار الموظف" });
    }
    if (!['bonus', 'borrowing', 'penalty'].includes(type)) {
      return res.status(400).json({ error: "نوع العملية غير صالح" });
    }
    const cleanAmount = Math.round((Number(amount) || 0) * 100) / 100;
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      return res.status(400).json({ error: "المبلغ يجب أن يكون أكبر من صفر" });
    }
    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    if (!cleanReason) {
      return res.status(400).json({ error: "يرجى إدخال السبب / البيان الخاص بالعملية" });
    }

    const emp = await employeesCollection.findOne({ _id: new ObjectId(employeeId) });
    if (!emp) {
      return res.status(404).json({ error: "الموظف غير موجود" });
    }
    if (!isEmployeeInUserScope(emp, req)) {
      return res.status(403).json({ error: "ليس لديك صلاحية لتسجيل عملية لموظف في فرع آخر" });
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    const cleanDate = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim()))
      ? date.trim()
      : todayStr;
    const monthKey = cleanDate.slice(0, 7);
    const txNumber = await getNextEmpTxNumber();
    const now = new Date();

    const txDoc = {
      txNumber,
      employeeId: emp._id,
      jobId: emp.jobId || null,
      employeeName: emp.name,
      employeePhone: emp.phone || '',
      employeeJobName: emp.jobName || '',
      branch: emp.branch || 'shop1',
      type,
      amount: cleanAmount,
      reason: cleanReason.slice(0, 600),
      date: cleanDate,
      monthKey,
      recordedBy: {
        username: req.staffUser?.username || 'staff',
        name: req.staffUser?.name || req.staffUser?.username || 'موظف',
        role: req.staffUser?.role === 'admin' ? 'admin' : 'order_manager'
      },
      createdAt: now
    };

    const result = await employeeTransactionsCollection.insertOne(txDoc);
    res.status(201).json({ success: true, transaction: { _id: result.insertedId, ...txDoc } });
  } catch (err) {
    console.error("Create employee transaction error:", err);
    res.status(500).json({ error: "فشل في تسجيل العملية المالية للموظف" });
  }
});

app.delete("/api/admin/employees/transactions/:id", checkMongoDB, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "معرف العملية غير صالح" });
    }
    const del = await employeeTransactionsCollection.deleteOne({ _id: new ObjectId(id) });
    if (del.deletedCount === 0) {
      return res.status(404).json({ error: "العملية غير موجودة" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete employee transaction error:", err);
    res.status(500).json({ error: "فشل في حذف العملية" });
  }
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============ CHEF MANAGEMENT & PRODUCTION REPORT ============

// Get all chefs for active shop
app.get("/api/admin/chefs", checkMongoDB, checkStaff, async (req, res) => {
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
app.post("/api/admin/chefs", checkMongoDB, checkStaff, async (req, res) => {
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
app.put("/api/admin/chefs/:id", checkMongoDB, checkStaff, async (req, res) => {
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
app.delete("/api/admin/chefs/:id", checkMongoDB, checkStaff, async (req, res) => {
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
app.put("/api/admin/chefs/:id/assign-products", checkMongoDB, checkStaff, async (req, res) => {
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
app.get("/api/admin/production/report", checkMongoDB, checkStaff, async (req, res) => {
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
app.get("/api/admin/production/product-orders", checkMongoDB, checkStaff, async (req, res) => {
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

const formatBackupFileName = (dateObj, idStr = '') => {
  const d = dateObj instanceof Date && !isNaN(dateObj) ? dateObj : new Date(dateObj || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const suffix = idStr ? `_${String(idStr).slice(-6)}` : '';
  return `emenu-backup-${ts}${suffix}.json`;
};

const ensureLocalBackupDir = () => {
  try {
    if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
      fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    }
    return true;
  } catch (err) {
    console.warn("[BACKUP] Could not create LOCAL_BACKUP_DIR:", err.message);
    return false;
  }
};

// Reusable full database backup helper (writes JSON to LOCAL_BACKUP_DIR and metadata to MongoDB)
const performFullDatabaseBackup = async (customLabel = "") => {
  const [
    products, categories, tags, orders, customers, favorites,
    payments, counters, chefs, employees, employeeJobs, employeeTransactions,
    carousel, adminUsers,
    products2, categories2, tags2, orders2, chefs2, stockReservations2
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
    employeesCollection.find({}).toArray(),
    employeeJobsCollection.find({}).toArray(),
    employeeTransactionsCollection.find({}).toArray(),
    carouselCollection.find({}).toArray(),
    adminUsersCollection.find({}).toArray(),
    productsCollection2.find({}).toArray(),
    categoriesCollection2.find({}).toArray(),
    tagsCollection2.find({}).toArray(),
    ordersCollection2.find({}).toArray(),
    chefsCollection2.find({}).toArray(),
    stockReservationsCollection.find({}).toArray()
  ]);

  const backupId = new ObjectId();
  const now = new Date();
  const fileName = formatBackupFileName(now, backupId.toString());
  const filePath = path.join(LOCAL_BACKUP_DIR, fileName);

  const backupDoc = {
    _id: backupId,
    createdAt: now,
    label: customLabel || `نسخة احتياطية - ${now.toLocaleString('ar-LY')}`,
    fileName,
    filePath,
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
      "emenu.employees": employees,
      "emenu.employee_jobs": employeeJobs,
      "emenu.employee_transactions": employeeTransactions,
      "emenu.marketing_carousel": carousel,
      "emenu.admin_users": adminUsers,
      "emenu2.products": products2,
      "emenu2.categories": categories2,
      "emenu2.tags": tags2,
      "emenu2.orders": orders2,
      "emenu2.chefs": chefs2,
      "emenu2.stock_reservations": stockReservations2
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
      "emenu.employees": employees.length,
      "emenu.employee_jobs": employeeJobs.length,
      "emenu.employee_transactions": employeeTransactions.length,
      "emenu.marketing_carousel": carousel.length,
      "emenu.admin_users": adminUsers.length,
      "emenu2.products": products2.length,
      "emenu2.categories": categories2.length,
      "emenu2.tags": tags2.length,
      "emenu2.orders": orders2.length,
      "emenu2.chefs": chefs2.length,
      "emenu2.stock_reservations": stockReservations2.length
    }
  };

  let savedToDisk = false;
  if (ensureLocalBackupDir()) {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(backupDoc, null, 2), "utf8");
      savedToDisk = true;
      console.log(`[BACKUP] Saved JSON backup to disk: ${filePath}`);
    } catch (diskErr) {
      console.error("[BACKUP] Failed writing JSON to disk:", diskErr.message);
    }
  }

  const { collections, ...metaOnlyDoc } = backupDoc;
  if (savedToDisk) {
    await backupsCollection.insertOne(metaOnlyDoc);
  } else {
    try {
      await backupsCollection.insertOne(backupDoc);
    } catch (dbErr) {
      console.warn("[BACKUP] Full document insert failed, storing metadata-only in MongoDB:", dbErr.message);
      await backupsCollection.insertOne(metaOnlyDoc);
    }
  }

  console.log(`[BACKUP] Backup created successfully: ${backupId}`);
  return { backupId, fileName, filePath: savedToDisk ? filePath : null, savedToDisk, stats: backupDoc.stats };
};

// Create a full backup of all collections and save JSON to C:\Users\<user>\Documents\EmenuBackup
app.post("/api/admin/backup", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const { label } = req.body;
    console.log("[BACKUP] Creating full database backup...");
    const result = await performFullDatabaseBackup(label);

    res.json({
      success: true,
      message: "تم إنشاء وحفظ النسخة الاحتياطية بنجاح",
      backupId: result.backupId,
      fileName: result.fileName,
      filePath: result.filePath,
      backupDir: LOCAL_BACKUP_DIR,
      stats: result.stats
    });
  } catch (err) {
    console.error("Backup creation error:", err);
    res.status(500).json({ success: false, error: "فشل في إنشاء النسخة الاحتياطية" });
  }
});

// List all backups (metadata + sync existing MongoDB backups to C:\Users\<user>\Documents\EmenuBackup)
app.get("/api/admin/backups", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    ensureLocalBackupDir();
    const backups = await backupsCollection.find({}, {
      projection: { collections: 0 } // Exclude full data, return only metadata + stats
    }).sort({ createdAt: -1 }).toArray();

    // Ensure every MongoDB backup also has its JSON file written to LOCAL_BACKUP_DIR
    for (const b of backups) {
      const expectedFileName = b.fileName || formatBackupFileName(b.createdAt, b._id.toString());
      const expectedFilePath = path.join(LOCAL_BACKUP_DIR, expectedFileName);
      b.fileName = expectedFileName;
      b.filePath = expectedFilePath;

      if (!fs.existsSync(expectedFilePath)) {
        try {
          const fullDoc = await backupsCollection.findOne({ _id: b._id });
          if (fullDoc && fullDoc.collections) {
            fullDoc.fileName = expectedFileName;
            fullDoc.filePath = expectedFilePath;
            await fs.promises.writeFile(expectedFilePath, JSON.stringify(fullDoc, null, 2), "utf8");
            await backupsCollection.updateOne(
              { _id: b._id },
              { $set: { fileName: expectedFileName, filePath: expectedFilePath } }
            );
            console.log(`[BACKUP] Synced existing MongoDB backup to disk: ${expectedFilePath}`);
          }
        } catch (syncErr) {
          console.warn("[BACKUP] Could not sync backup to disk:", syncErr.message);
        }
      }
    }

    res.json({ success: true, backups, backupDir: LOCAL_BACKUP_DIR });
  } catch (err) {
    console.error("List backups error:", err);
    res.status(500).json({ success: false, error: "فشل في جلب قائمة النسخ الاحتياطية" });
  }
});

// Download a backup as JSON (reads from local disk first, falls back to MongoDB)
app.get("/api/admin/backup/:id/download", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const backup = await backupsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!backup) {
      return res.status(404).json({ success: false, error: "النسخة الاحتياطية غير موجودة" });
    }

    const fileName = backup.fileName || `emenu-backup-${backup.createdAt.toISOString().slice(0, 10)}.json`;
    const localCandidate = path.join(LOCAL_BACKUP_DIR, fileName);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    if (fs.existsSync(localCandidate)) {
      return res.sendFile(localCandidate);
    }

    res.json(backup);
  } catch (err) {
    console.error("Backup download error:", err);
    res.status(500).json({ success: false, error: "فشل في تحميل النسخة الاحتياطية" });
  }
});

// Delete a backup (removes from both MongoDB and local disk)
app.delete("/api/admin/backup/:id", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const existing = await backupsCollection.findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { collections: 0 } }
    );
    const result = await backupsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: "النسخة الاحتياطية غير موجودة" });
    }

    if (existing) {
      const candidateName = existing.fileName || formatBackupFileName(existing.createdAt, existing._id.toString());
      const candidatePath = path.join(LOCAL_BACKUP_DIR, candidateName);
      if (fs.existsSync(candidatePath)) {
        try {
          await fs.promises.unlink(candidatePath);
          console.log(`[BACKUP] Deleted local backup file: ${candidatePath}`);
        } catch (unlinkErr) {
          console.warn("[BACKUP] Could not delete local backup file:", unlinkErr.message);
        }
      }
    }

    res.json({ success: true, message: "تم حذف النسخة الاحتياطية" });
  } catch (err) {
    console.error("Backup delete error:", err);
    res.status(500).json({ success: false, error: "فشل في حذف النسخة الاحتياطية" });
  }
});

// Reset orders, payments, and optionally customer balances
app.post("/api/admin/reset/orders", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  try {
    const { confirm, resetCustomerBalances } = req.body;

    if (confirm !== "RESET_ALL_ORDERS") {
      return res.status(400).json({ success: false, error: "رمز التأكيد غير صحيح" });
    }

    // Mandatory pre-reset safety backup to prevent any accidental data loss
    console.log("[RESET] Creating mandatory pre-reset safety backup before deleting orders...");
    const preResetBackup = await performFullDatabaseBackup(`نسخة أمان تلقائية قبل تصفير الطلبات - ${new Date().toLocaleString('ar-LY')}`);
    if (!preResetBackup || !preResetBackup.savedToDisk) {
      return res.status(500).json({
        success: false,
        error: "تم إيقاف عملية المسح تلقائياً لعدم إمكانية حفظ نسخة الأمان الاحتياطية على القرص"
      });
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

    invalidateAnalyticsCache();

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
    employeesCollection = db.collection("employees");
    employeeJobsCollection = db.collection("employee_jobs");
    employeeTransactionsCollection = db.collection("employee_transactions");
    backupsCollection = db.collection("backups");
    telemetryCollection = db.collection("telemetry");
    stockReservationsCollection = db2.collection("stock_reservations");
    mongoConnected = true;
    
    const safeIndex = (coll, spec, opts) => coll.createIndex(spec, opts).catch(() => {});

    // Product, category & tag indexes (compound category+subCategory covers single-field category queries)
    safeIndex(productsCollection, { category: 1, subCategory: 1 });
    safeIndex(productsCollection, { tags: 1 });
    safeIndex(categoriesCollection, { name: 1 }, { unique: true });
    safeIndex(tagsCollection, { name: 1 }, { unique: true });
    safeIndex(productsCollection2, { category: 1, subCategory: 1 });
    safeIndex(productsCollection2, { tags: 1 });
    safeIndex(categoriesCollection2, { name: 1 }, { unique: true });
    safeIndex(tagsCollection2, { name: 1 }, { unique: true });

    // Customer & favorites indexes
    safeIndex(customersCollection, { phone: 1 }, { unique: true });
    safeIndex(customersCollection, { outstandingBalance: -1 });
    safeIndex(favoritesCollection, { phone: 1, productId: 1, shop: 1 }, { unique: true });

    // Order indexes (compound customerInfo.phone+createdAt covers single-field phone lookups)
    safeIndex(ordersCollection, { orderNumber: 1 });
    safeIndex(ordersCollection, { createdAt: -1 });
    safeIndex(ordersCollection, { deliveryDate: 1 });
    safeIndex(ordersCollection, { status: 1, paymentStatus: 1 });
    safeIndex(ordersCollection, { status: 1, createdAt: -1 });
    safeIndex(ordersCollection, { "customerInfo.phone": 1, createdAt: -1 });
    safeIndex(ordersCollection, { cancelledAt: 1 }, { expireAfterSeconds: 86400 });

    safeIndex(ordersCollection2, { orderNumber: 1 });
    safeIndex(ordersCollection2, { createdAt: -1 });
    safeIndex(ordersCollection2, { deliveryDate: 1 });
    safeIndex(ordersCollection2, { status: 1, paymentStatus: 1 });
    safeIndex(ordersCollection2, { status: 1, createdAt: -1 });
    safeIndex(ordersCollection2, { "customerInfo.phone": 1, createdAt: -1 });
    safeIndex(ordersCollection2, { cancelledAt: 1 }, { expireAfterSeconds: 86400 });

    // Stock reservation indexes (compound status+reservedAt covers expiry sweep & status filtering)
    safeIndex(stockReservationsCollection, { orderId: 1 });
    safeIndex(stockReservationsCollection, { orderNumber: 1 });
    safeIndex(stockReservationsCollection, { status: 1, reservedAt: 1 });
    safeIndex(stockReservationsCollection, { reservedAt: -1 });
    safeIndex(stockReservationsCollection, { "items.inventoryRecordId": 1 });

    // Admin, chef & backup metadata indexes
    safeIndex(adminUsersCollection, { username: 1 }, { unique: true });
    safeIndex(chefsCollection, { name: 1 });
    safeIndex(chefsCollection2, { name: 1 });
    safeIndex(employeeJobsCollection, { name: 1 }, { unique: true });
    safeIndex(employeesCollection, { branch: 1, active: 1 });
    safeIndex(employeesCollection, { jobId: 1 });
    safeIndex(employeeTransactionsCollection, { employeeId: 1, monthKey: 1, createdAt: -1 });
    safeIndex(employeeTransactionsCollection, { monthKey: 1, branch: 1, createdAt: -1 });
    safeIndex(employeeTransactionsCollection, { txNumber: 1 });
    safeIndex(backupsCollection, { createdAt: -1 });

    // Telemetry indexes with 30-day automatic pruning TTL + compound event/shop/timestamp index
    safeIndex(telemetryCollection, { timestamp: 1 }, { expireAfterSeconds: 30 * 86400 });
    safeIndex(telemetryCollection, { event: 1, shop: 1, timestamp: -1 });
    safeIndex(telemetryCollection, { shop: 1, timestamp: -1 });

    // Payment collection indexes
    safeIndex(paymentsCollection, { customerPhone: 1, createdAt: -1 });
    safeIndex(paymentsCollection, { createdAt: -1 });
    safeIndex(paymentsCollection, { "distributedTo.orderId": 1 });

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
      await productsCollection.updateMany(
        { piecesPerUnit: { $exists: false } },
        { $set: { piecesPerUnit: null } }
      );
      await productsCollection2.updateMany(
        { piecesPerUnit: { $exists: false } },
        { $set: { piecesPerUnit: null } }
      );
      await productsCollection.updateMany(
        { chefCoefficient: { $exists: false } },
        { $set: { chefCoefficient: 0 } }
      );
      await productsCollection2.updateMany(
        { chefCoefficient: { $exists: false } },
        { $set: { chefCoefficient: 0 } }
      );
      console.log("✓ Products makingCost, piecesPerUnit & chefCoefficient migration check completed");
    } catch (migErr) {
      console.warn("Product migration warning:", migErr.message);
    }

    // Seed default employee jobs if empty
    try {
      const jobsCount = await employeeJobsCollection.countDocuments();
      if (jobsCount === 0) {
        const now = new Date();
        await employeeJobsCollection.insertMany([
          { name: "شيف / منتج", payType: "production", description: "احتساب المستحق الشهري من مجموع (الكمية المباعة لكل صنف × القيمة الثابتة للوحدة) بدون راتب أساسي", createdAt: now, updatedAt: now },
          { name: "كاشير", payType: "fixed", description: "موظف صندوق ومبيعات براتب شهري ثابت", createdAt: now, updatedAt: now },
          { name: "إداري", payType: "fixed", description: "إدارة وإشراف براتب شهري ثابت", createdAt: now, updatedAt: now },
          { name: "مبيعات وخدمة", payType: "fixed", description: "تجهيز وخدمة طلبات براتب شهري ثابت", createdAt: now, updatedAt: now }
        ]);
        console.log("✓ Default employee jobs initialized");
      }
    } catch (jobErr) {
      console.warn("Default employee jobs seed warning:", jobErr.message);
    }

    // Seed default admin user with PBKDF2 passwordHash if empty, and migrate any legacy plaintext passwords
    const userCount = await adminUsersCollection.countDocuments();
    if (userCount === 0) {
      console.log("Initializing default admin user...");
      await adminUsersCollection.insertOne({
        name: "المدير العام",
        username: ADMIN_USER,
        passwordHash: hashCustomerPassword(ADMIN_PASS),
        role: "admin",
        shopAccess: "all",
        tokenVersion: 1,
        createdAt: new Date()
      });
      console.log("✓ Default admin user initialized (PBKDF2 hashed)");
    } else {
      const legacyUsers = await adminUsersCollection.find({
        $or: [
          { password: { $exists: true } },
          { tokenVersion: { $exists: false } }
        ]
      }).toArray();
      for (const lu of legacyUsers) {
        const setOps = {
          tokenVersion: Number.isInteger(lu.tokenVersion) && lu.tokenVersion > 0 ? lu.tokenVersion : 1
        };
        if (!lu.passwordHash && lu.password) {
          setOps.passwordHash = hashCustomerPassword(String(lu.password).trim());
        }
        await adminUsersCollection.updateOne(
          { _id: lu._id },
          {
            $set: setOps,
            ...(lu.password !== undefined ? { $unset: { password: "" } } : {})
          }
        );
      }
      if (legacyUsers.length > 0) {
        invalidateStaffSessionCache();
        console.log(`✓ Migrated ${legacyUsers.length} staff account(s) to PBKDF2 + tokenVersion`);
      }
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

    // Close any lingering stock reservations for Shop 2 cancelled orders before deletion
    if (stockReservationsCollection) {
      try {
        const expiredShop2Orders = await ordersCollection2.find({
          status: "cancelled",
          $or: [
            { cancelledAt: { $lte: cutoff } },
            { $and: [{ $or: [{ cancelledAt: { $exists: false } }, { cancelledAt: null }] }, { updatedAt: { $lte: cutoff } }] },
            { $and: [{ $or: [{ cancelledAt: { $exists: false } }, { cancelledAt: null }] }, { createdAt: { $lte: cutoff } }] }
          ]
        }).project({ _id: 1 }).toArray();

        if (expiredShop2Orders.length > 0) {
          const expiredIds = expiredShop2Orders.map(o => o._id);
          const expiredStrIds = expiredIds.map(id => id.toString());
          await stockReservationsCollection.updateMany(
            {
              $or: [
                { orderId: { $in: expiredIds } },
                { orderId: { $in: expiredStrIds } }
              ],
              status: { $in: ['reserved', 'deducted'] }
            },
            {
              $set: {
                status: 'returned',
                returnedAt: new Date(),
                updatedAt: new Date(),
                cleanupNote: 'closed_on_expired_order_deletion'
              }
            }
          );
        }
      } catch (cleanErr) {
        console.warn("[Auto-Cleanup] Warning closing expired reservations:", cleanErr.message);
      }
    }

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
app.post("/api/admin/orders/cleanup-cancelled", checkMongoDB, requireGlobalAdmin, async (req, res) => {
  const result = await cleanupExpiredCancelledOrders();
  if (result.totalDeleted > 0) {
    invalidateAnalyticsCache();
  }
  res.json(result);
});

// Process Crash Protection & Logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

connectWithRetry();

// Schedule periodic cleanup of cancelled orders every 30 minutes
setInterval(cleanupExpiredCancelledOrders, 30 * 60 * 1000).unref();

// Schedule periodic inventory reconciliation sweep every 6 hours
setInterval(reconcileInventoryStock, 6 * 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
