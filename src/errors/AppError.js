'use strict';

const crypto = require('crypto');

const loggedErrors = new WeakSet();

const DEFAULT_FALLBACK_MESSAGES = Object.freeze({
  400: 'بيانات الطلب غير صالحة',
  401: 'غير مصرح، يرجى تسجيل الدخول',
  403: 'ليس لديك صلاحية تنفيذ هذه العملية',
  404: 'العنصر المطلوب غير موجود',
  409: 'تعارض في البيانات المطلوبة',
  429: 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً',
  500: 'حدث خطأ داخلي في الخادم، يرجى المحاولة لاحقاً',
  502: 'تعذر الاتصال بالخدمة الخارجية، يرجى المحاولة لاحقاً',
  503: 'الخدمة غير متاحة مؤقتاً، يرجى المحاولة لاحقاً',
});

const DEFAULT_CODES = Object.freeze({
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_ERROR',
  503: 'SERVICE_UNAVAILABLE',
});

/**
 * Base typed operational application error.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, statusCode?: number, retryable?: boolean, details?: unknown, cause?: unknown, isUpstream?: boolean }} [options]
   */
  constructor(message, options = {}) {
    const {
      code = 'INTERNAL_ERROR',
      statusCode = 500,
      retryable = false,
      details = undefined,
      cause = undefined,
      isUpstream = false,
    } = options || {};

    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = String(code || 'INTERNAL_ERROR');
    this.statusCode =
      Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
        ? statusCode
        : 500;
    this.retryable = Boolean(retryable);
    this.details = details;
    if (cause !== undefined && this.cause === undefined) {
      this.cause = cause;
    }
    this.isUpstream = Boolean(isUpstream);
    this.isOperational = true;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends AppError {
  constructor(message = DEFAULT_FALLBACK_MESSAGES[400], options = {}) {
    super(message, {
      code: options.code || 'VALIDATION_ERROR',
      statusCode: options.statusCode || 400,
      retryable: false,
      details: options.details,
      cause: options.cause,
    });
  }
}

class AuthError extends AppError {
  constructor(message = DEFAULT_FALLBACK_MESSAGES[401], options = {}) {
    const statusCode = options.statusCode === 403 ? 403 : (options.statusCode || 401);
    super(message, {
      code: options.code || (statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'),
      statusCode,
      retryable: false,
      details: options.details,
      cause: options.cause,
    });
  }
}

class NotFoundError extends AppError {
  constructor(message = DEFAULT_FALLBACK_MESSAGES[404], options = {}) {
    super(message, {
      code: options.code || 'NOT_FOUND',
      statusCode: options.statusCode || 404,
      retryable: false,
      details: options.details,
      cause: options.cause,
    });
  }
}

class UpstreamError extends AppError {
  constructor(message = DEFAULT_FALLBACK_MESSAGES[502], options = {}) {
    const statusCode = options.statusCode === 503 ? 503 : (options.statusCode || 502);
    super(message, {
      code: options.code || 'UPSTREAM_ERROR',
      statusCode,
      retryable: options.retryable !== undefined ? Boolean(options.retryable) : true,
      details: options.details,
      cause: options.cause,
      isUpstream: true,
    });
  }
}

function resolveRequestId(req, res) {
  if (req && typeof req.id === 'string' && req.id.trim()) {
    return req.id.trim();
  }
  const headerVal = req && req.headers ? req.headers['x-request-id'] : undefined;
  if (typeof headerVal === 'string') {
    const clean = headerVal.replace(/[\r\n]/g, '').trim().slice(0, 128);
    if (clean) return clean;
  }
  if (res && typeof res.getHeader === 'function') {
    const existing = res.getHeader('X-Request-Id');
    if (typeof existing === 'string' && existing.trim()) {
      return existing.trim();
    }
  }
  return crypto.randomUUID();
}

/**
 * Express middleware attaching a correlation ID to `req.id` and `X-Request-Id`.
 */
function requestIdMiddleware(req, res, next) {
  const requestId = resolveRequestId(req, res);
  req.id = requestId;
  if (res && typeof res.setHeader === 'function' && !res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }
  if (typeof next === 'function') {
    next();
  }
}

function logErrorOnce(err, context) {
  if (err && typeof err === 'object') {
    if (loggedErrors.has(err)) return;
    loggedErrors.add(err);
  }
  console.error('[HTTP ERROR]', JSON.stringify(context));
}

function resolveStatusCode(err, overrideStatusCode) {
  if (err instanceof AppError) {
    return err.statusCode;
  }
  if (err && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600) {
    return err.statusCode;
  }
  if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 600) {
    return err.status;
  }
  if (Number.isInteger(overrideStatusCode) && overrideStatusCode >= 400 && overrideStatusCode < 600) {
    return overrideStatusCode;
  }
  return 500;
}

/**
 * Send a structured, non-leaking JSON error response and log internal details once.
 */
function sendSafeError(res, req, err, options = {}) {
  const {
    fallbackMessage = undefined,
    statusCode: overrideStatusCode = undefined,
    code: overrideCode = undefined,
    extra = undefined,
  } = options || {};

  const requestId = resolveRequestId(req, res);
  if (req && !req.id) {
    req.id = requestId;
  }
  if (res && typeof res.setHeader === 'function' && !res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }

  const resolvedStatus = resolveStatusCode(err, overrideStatusCode);
  const resolvedCode =
    (typeof overrideCode === 'string' && overrideCode) ||
    (err && typeof err.code === 'string' && err.code) ||
    DEFAULT_CODES[resolvedStatus] ||
    (resolvedStatus >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

  const isUpstream = Boolean(err instanceof UpstreamError || (err && err.isUpstream));
  const retryable =
    err instanceof AppError
      ? Boolean(err.retryable)
      : resolvedStatus === 429 || resolvedStatus === 502 || resolvedStatus === 503;

  let safeMessage;
  if (resolvedStatus >= 500 || isUpstream) {
    safeMessage =
      fallbackMessage ||
      DEFAULT_FALLBACK_MESSAGES[resolvedStatus] ||
      DEFAULT_FALLBACK_MESSAGES[500];
  } else if (err instanceof AppError && err.message) {
    safeMessage = err.message;
  } else if (err && err.type === 'entity.parse.failed') {
    safeMessage = 'صيغة البيانات المرسلة غير صالحة';
  } else {
    safeMessage =
      fallbackMessage ||
      DEFAULT_FALLBACK_MESSAGES[resolvedStatus] ||
      DEFAULT_FALLBACK_MESSAGES[400];
  }

  logErrorOnce(err, {
    timestamp: new Date().toISOString(),
    requestId,
    method: req ? req.method : undefined,
    path: req ? (req.originalUrl || req.url) : undefined,
    statusCode: resolvedStatus,
    code: resolvedCode,
    retryable,
    errorName: err && err.name ? err.name : typeof err,
    errorMessage: err && err.message ? err.message : String(err),
    details: err && err.details !== undefined ? err.details : undefined,
    stack: err && err.stack ? err.stack : undefined,
  });

  if (!res || res.headersSent) {
    return;
  }

  const payload = {
    error: safeMessage,
    code: resolvedCode,
    message: safeMessage,
    requestId,
    retryable,
    ...(extra && typeof extra === 'object' ? extra : {}),
  };

  return res.status(resolvedStatus).json(payload);
}

/**
 * Final 4-argument Express error-handling middleware.
 */
function errorHandlerMiddleware(err, req, res, next) {
  if (res && res.headersSent) {
    return next(err);
  }
  return sendSafeError(res, req, err);
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  UpstreamError,
  requestIdMiddleware,
  sendSafeError,
  errorHandlerMiddleware,
};
