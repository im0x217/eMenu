'use strict';

const crypto = require('crypto');
const path = require('path');
const { DEFAULT_ADMIN_SESSION_SECRET } = require('../config/env');
const { ValidationError } = require('../errors/AppError');

const STAFF_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_CUSTOMER_TOKEN_TTL_DAYS = 30;
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_TO_EXTENSIONS = Object.freeze({
  'image/jpeg': Object.freeze(['.jpg', '.jpeg']),
  'image/png': Object.freeze(['.png']),
  'image/webp': Object.freeze(['.webp']),
  'image/gif': Object.freeze(['.gif']),
});

const INVALID_IMAGE_TYPE_MESSAGE =
  'نوع الملف غير مدعوم. يُسمح فقط برفع الصور الآمنة (JPG، PNG، WEBP، GIF)';

/**
 * Constant-time string comparison via HMAC digests to eliminate length/timing leaks.
 */
function safeCompareStrings(a, b, secret = DEFAULT_ADMIN_SESSION_SECRET) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const hmacKey = secret || DEFAULT_ADMIN_SESSION_SECRET;
  const hashA = crypto.createHmac('sha256', hmacKey).update(a).digest();
  const hashB = crypto.createHmac('sha256', hmacKey).update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Constant-time hex string comparison.
 */
function safeCompareHex(hexA, hexB) {
  if (
    typeof hexA !== 'string' ||
    typeof hexB !== 'string' ||
    hexA.length !== hexB.length ||
    hexA.length % 2 !== 0
  ) {
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

/**
 * Normalize Arabic hamza/alef & spacing variants for forgiving username matching.
 */
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

/**
 * Convert Arabic-Indic and Eastern Arabic numerals to ASCII digits.
 */
function convertArabicDigits(str) {
  if (str === null || str === undefined) return '';
  return str
    .toString()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

function scryptAsync(password, salt, keylen = 64) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

function pbkdf2Async(password, salt, iterations = 10000, keylen = 64, digest = 'sha512') {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

/**
 * Hash a password asynchronously using salted scrypt (`scrypt:<saltHex>:<derivedHex>`).
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPasswordAsync(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new ValidationError('كلمة المرور مطلوبة');
  }
  const saltHex = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, saltHex, 64);
  return `scrypt:${saltHex}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a password asynchronously against `scrypt:`, legacy `<salt>:<pbkdf2Hex>`,
 * or legacy plaintext `storedPlain`.
 * @param {string} password
 * @param {string | undefined | null} storedHash
 * @param {string | undefined | null} storedPlain
 * @param {string} [secret]
 * @returns {Promise<boolean>}
 */
async function verifyPasswordAsync(
  password,
  storedHash,
  storedPlain = undefined,
  secret = DEFAULT_ADMIN_SESSION_SECRET
) {
  if (typeof password !== 'string' || password.length === 0) return false;

  if (storedHash && typeof storedHash === 'string') {
    if (storedHash.startsWith('scrypt:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 3 || !parts[1] || !parts[2]) return false;
      try {
        const derived = await scryptAsync(password, parts[1], 64);
        return safeCompareHex(derived.toString('hex'), parts[2]);
      } catch {
        return false;
      }
    }

    if (storedHash.includes(':')) {
      const parts = storedHash.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
      try {
        const derived = await pbkdf2Async(password, parts[0], 10000, 64, 'sha512');
        return safeCompareHex(derived.toString('hex'), parts[1]);
      } catch {
        return false;
      }
    }

    return false;
  }

  if (storedPlain && typeof storedPlain === 'string') {
    return safeCompareStrings(storedPlain.trim(), password.trim(), secret);
  }

  return false;
}

/**
 * Return true if the stored hash is missing or uses a legacy pre-scrypt format.
 * @param {string | undefined | null} storedHash
 * @returns {boolean}
 */
function isLegacyPasswordHash(storedHash) {
  return Boolean(!storedHash || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt:'));
}

/**
 * Generate a signed customer token (`base64(phone:timestamp:rand:hmacHex)`).
 */
function generateCustomerToken(phone, options = {}) {
  const secret = options.secret || DEFAULT_ADMIN_SESSION_SECRET;
  const nowMs = Number.isFinite(options.now) ? options.now : Date.now();
  const payload = `${phone}:${nowMs}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

/**
 * Verify a signed customer token, enforcing HMAC integrity, phone binding,
 * and expiration based on `ttlDays` (default 30 days).
 */
function verifyCustomerToken(token, expectedPhone, options = {}) {
  if (!token || typeof token !== 'string') return false;
  const secret = options.secret || DEFAULT_ADMIN_SESSION_SECRET;
  const ttlDays =
    Number.isFinite(options.ttlDays) && options.ttlDays > 0
      ? options.ttlDays
      : DEFAULT_CUSTOMER_TOKEN_TTL_DAYS;
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const nowMs = Number.isFinite(options.now) ? options.now : Date.now();

  try {
    const cleanToken = token.trim();
    const decoded = Buffer.from(cleanToken, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return false;

    const [tokenPhone, timestampRaw, rand, signature] = parts;
    const timestamp = Number(timestampRaw);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || nowMs - timestamp > ttlMs) {
      return false;
    }

    const payload = `${tokenPhone}:${timestampRaw}:${rand}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    if (!safeCompareHex(signature, expectedSig)) return false;

    if (expectedPhone) {
      const cleanExpected = convertArabicDigits(expectedPhone)
        .toString()
        .replace(/[^0-9]/g, '');
      const cleanTokenPhone = convertArabicDigits(tokenPhone)
        .toString()
        .replace(/[^0-9]/g, '');
      if (!cleanExpected || cleanExpected.slice(-9) !== cleanTokenPhone.slice(-9)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generate signed, revocable per-user staff session token (`emu1.<base64urlPayload>.<hmacHex>`).
 */
function generateStaffSessionToken(user, secret = DEFAULT_ADMIN_SESSION_SECRET) {
  const now = Date.now();
  const payloadObj = {
    sub: String(user.id || user._id || 'env:admin'),
    u: String(user.username || user.name || 'admin'),
    name: String(user.name || user.username || 'المدير العام'),
    role: user.role === 'order_manager' ? 'order_manager' : 'admin',
    shopAccess: ['shop1', 'shop2', 'all'].includes(user.shopAccess) ? user.shopAccess : 'all',
    tv: Number.isInteger(user.tokenVersion) && user.tokenVersion > 0 ? user.tokenVersion : 1,
    iat: now,
    exp: now + STAFF_SESSION_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`emu1.${encodedPayload}`)
    .digest('hex');
  return `emu1.${encodedPayload}.${sig}`;
}

function verifyStaffSessionTokenCrypto(token, secret = DEFAULT_ADMIN_SESSION_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed.startsWith('emu1.')) return null;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;
  const [, encodedPayload, providedSig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
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

function generateBulkAccessToken(secret = DEFAULT_ADMIN_SESSION_SECRET) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(12).toString('hex');
  const data = `bulk1.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${sig}`;
}

/**
 * Validate uploaded raster image metadata (strictly jpg/jpeg/png/webp/gif + matching MIME).
 * Rejects .svg, .html, .js, .exe, missing extensions, and spoofed MIME mismatches.
 * @param {{ mimetype?: string, originalname?: string }} file
 * @returns {{ mimetype: string, ext: string }}
 */
function validateImageUpload(file) {
  if (!file || typeof file !== 'object') {
    throw new ValidationError(INVALID_IMAGE_TYPE_MESSAGE, { code: 'INVALID_FILE_TYPE' });
  }

  const mimetype = String(file.mimetype || '')
    .toLowerCase()
    .split(';')[0]
    .trim();
  const ext = path.extname(String(file.originalname || '').trim()).toLowerCase();

  const allowedExts = ALLOWED_MIME_TO_EXTENSIONS[mimetype];
  if (!allowedExts || !ext || !allowedExts.includes(ext)) {
    throw new ValidationError(INVALID_IMAGE_TYPE_MESSAGE, { code: 'INVALID_FILE_TYPE' });
  }

  return { mimetype, ext };
}

/**
 * Build a non-guessable UUID S3 object key preserving only the validated lowercase extension.
 * Never embeds raw user-supplied `file.originalname`.
 */
function buildSafeS3ImageKey(file) {
  const { ext } = validateImageUpload(file);
  return `products/${crypto.randomUUID()}${ext}`;
}

/**
 * Multer-compatible `fileFilter` allowing only safe raster images.
 */
function imageUploadFileFilter(req, file, cb) {
  try {
    validateImageUpload(file);
    return cb(null, true);
  } catch (err) {
    if (req && typeof req === 'object') {
      req.fileValidationError = err.message;
    }
    return cb(err, false);
  }
}

module.exports = {
  STAFF_SESSION_TTL_MS,
  DEFAULT_CUSTOMER_TOKEN_TTL_DAYS,
  MAX_IMAGE_UPLOAD_BYTES,
  ALLOWED_MIME_TO_EXTENSIONS,
  INVALID_IMAGE_TYPE_MESSAGE,
  safeCompareStrings,
  safeCompareHex,
  normalizeArabicUsername,
  convertArabicDigits,
  hashPasswordAsync,
  verifyPasswordAsync,
  isLegacyPasswordHash,
  generateCustomerToken,
  verifyCustomerToken,
  generateStaffSessionToken,
  verifyStaffSessionTokenCrypto,
  generateBulkAccessToken,
  validateImageUpload,
  buildSafeS3ImageKey,
  imageUploadFileFilter,
};
