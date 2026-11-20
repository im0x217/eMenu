'use strict';

const os = require('os');
const path = require('path');

const DEFAULT_ADMIN_SESSION_SECRET = 'emenu-admin-secret-key-2026';
const DEFAULT_ADMIN_PASS = '1234';
const DEFAULT_BULK_CODE = '1234';
const DEFAULT_POCKETBASE_URL = 'https://crystal-crocodile.pikapod.net';
const DEFAULT_AWS_REGION = 'us-east-1';
const DEFAULT_AWS_S3_BUCKET = 'e-menu-products';
const DEFAULT_PORT = 3000;
const DEFAULT_CUSTOMER_TOKEN_TTL_DAYS = 30;

function trimOrEmpty(val) {
  return val === undefined || val === null ? '' : String(val).trim();
}

function parseBooleanFlag(val, fallback) {
  const clean = trimOrEmpty(val).toLowerCase();
  if (!clean) return fallback;
  if (['true', '1', 'yes', 'on'].includes(clean)) return true;
  if (['false', '0', 'no', 'off'].includes(clean)) return false;
  return fallback;
}

function parsePositiveInt(val, fallback, max = Infinity) {
  const clean = trimOrEmpty(val);
  if (!clean) return fallback;
  const parsed = Number(clean);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    return fallback;
  }
  return parsed;
}

function parsePositiveNumber(val, fallback) {
  const clean = trimOrEmpty(val);
  if (!clean) return fallback;
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Load and normalize runtime environment configuration without mutating process.env.
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ config: Readonly<Record<string, any>>, warnings: string[] }}
 */
function loadConfig(env = process.env) {
  const source = env && typeof env === 'object' ? env : {};
  const warnings = [];

  const nodeEnv = trimOrEmpty(source.NODE_ENV) || 'development';
  const isProduction = nodeEnv === 'production';

  const mongoUri = trimOrEmpty(source.MONGO_URI);
  const port = parsePositiveInt(source.PORT, DEFAULT_PORT, 65535);
  if (trimOrEmpty(source.PORT) && String(port) !== trimOrEmpty(source.PORT)) {
    warnings.push(`[CONFIG WARNING] Invalid PORT "${source.PORT}"; falling back to ${DEFAULT_PORT}.`);
  }

  const adminUser = trimOrEmpty(source.ADMIN_USER) || 'admin';
  const adminPass = trimOrEmpty(source.ADMIN_PASS) || DEFAULT_ADMIN_PASS;

  const rawSessionSecret = trimOrEmpty(source.ADMIN_SESSION_SECRET);
  const adminSessionSecret = rawSessionSecret || DEFAULT_ADMIN_SESSION_SECRET;

  const awsRegion = trimOrEmpty(source.AWS_REGION) || DEFAULT_AWS_REGION;
  const awsAccessKeyId = trimOrEmpty(source.AWS_ACCESS_KEY_ID);
  const awsSecretAccessKey = trimOrEmpty(source.AWS_SECRET_ACCESS_KEY);
  const awsS3Bucket = trimOrEmpty(source.AWS_S3_BUCKET) || DEFAULT_AWS_S3_BUCKET;
  const awsCloudfrontDomain = trimOrEmpty(source.AWS_CLOUDFRONT_DOMAIN);

  const rawPocketbaseUrl = trimOrEmpty(source.POCKETBASE_URL) || DEFAULT_POCKETBASE_URL;
  const pocketbaseUrl = rawPocketbaseUrl.replace(/\/+$/, '');

  const backupDir = trimOrEmpty(source.BACKUP_DIR) || path.join(os.homedir(), 'Documents', 'EmenuBackup');
  const bulkCode = trimOrEmpty(source.BULK_CODE) || DEFAULT_BULK_CODE;
  const publicStaffSelector = trimOrEmpty(source.PUBLIC_STAFF_SELECTOR).toLowerCase() !== 'false';

  const customerTokenTtlDays = parsePositiveNumber(
    source.CUSTOMER_TOKEN_TTL_DAYS,
    DEFAULT_CUSTOMER_TOKEN_TTL_DAYS
  );
  const customerTokenTtlMs = Math.round(customerTokenTtlDays * 24 * 60 * 60 * 1000);

  const strictConfig = parseBooleanFlag(source.STRICT_CONFIG, false);
  const enableDebugRoutes = parseBooleanFlag(source.ENABLE_DEBUG_ROUTES, !isProduction);

  const hasMissingOrDefaultSecret =
    !rawSessionSecret || rawSessionSecret === DEFAULT_ADMIN_SESSION_SECRET;
  const hasDefaultAdminPass = adminPass === DEFAULT_ADMIN_PASS;

  if (hasMissingOrDefaultSecret) {
    warnings.push(
      '[SECURITY CONFIG WARNING] ADMIN_SESSION_SECRET is missing or using the default fallback. Set a strong secret in environment variables.'
    );
  }
  if (hasDefaultAdminPass) {
    warnings.push(
      '[SECURITY CONFIG WARNING] ADMIN_PASS is unset or using the insecure default "1234". Set a strong ADMIN_PASS in environment variables.'
    );
  }
  if (bulkCode === DEFAULT_BULK_CODE) {
    warnings.push(
      '[SECURITY CONFIG WARNING] BULK_CODE is using the default fallback "1234".'
    );
  }
  if (!mongoUri) {
    warnings.push('[CONFIG WARNING] MONGO_URI is not set.');
  }

  if (strictConfig) {
    const strictViolations = [];
    if (hasMissingOrDefaultSecret) {
      strictViolations.push('ADMIN_SESSION_SECRET must be set to a non-default value when STRICT_CONFIG=true');
    }
    if (hasDefaultAdminPass) {
      strictViolations.push('ADMIN_PASS must not use the default "1234" when STRICT_CONFIG=true');
    }
    if (strictViolations.length > 0) {
      throw new Error(`[STRICT_CONFIG] ${strictViolations.join('; ')}`);
    }
  }

  const config = Object.freeze({
    nodeEnv,
    isProduction,
    mongoUri,
    port,
    adminUser,
    adminPass,
    adminSessionSecret,
    awsRegion,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsS3Bucket,
    awsCloudfrontDomain,
    pocketbaseUrl,
    backupDir,
    bulkCode,
    publicStaffSelector,
    customerTokenTtlDays,
    customerTokenTtlMs,
    strictConfig,
    enableDebugRoutes,
  });

  return { config, warnings };
}

/**
 * Validate configuration for live server startup and emit warnings loudly.
 * Throws when MONGO_URI is missing or when STRICT_CONFIG rejects weak defaults.
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ config: Readonly<Record<string, any>>, warnings: string[] }}
 */
function validateRuntimeConfig(env = process.env) {
  const result = loadConfig(env);

  if (!result.config.mongoUri) {
    throw new Error('[CONFIG ERROR] MONGO_URI is required to start the server.');
  }

  for (const warning of result.warnings) {
    console.warn(warning);
  }

  return result;
}

module.exports = {
  DEFAULT_ADMIN_SESSION_SECRET,
  DEFAULT_ADMIN_PASS,
  DEFAULT_POCKETBASE_URL,
  loadConfig,
  validateRuntimeConfig,
};
