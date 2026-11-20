'use strict';

/**
 * Create an in-memory sliding-window IP rate limiter middleware.
 * Tracks cleanup intervals cleanly via `.unref()`, optional `activeIntervals` array,
 * and an explicit `.stop()` method for graceful shutdown.
 *
 * @param {number} windowMs
 * @param {number} maxRequests
 * @param {{
 *   message?: string,
 *   skip?: (req: any) => boolean,
 *   activeIntervals?: Array<any>,
 *   logger?: { warn?: (msg: string, meta?: Record<string, any>) => void }
 * }} [options]
 */
function createRateLimiter(windowMs, maxRequests, options = {}) {
  const ipCache = new Map();
  const customMessage = options?.message || 'طلبات كثيرة جداً، يرجى المحاولة مرة أخرى لاحقاً.';
  const skipFn = typeof options?.skip === 'function' ? options.skip : null;
  const activeIntervals = Array.isArray(options?.activeIntervals) ? options.activeIntervals : null;
  const logger = options?.logger || null;

  const cleanupMs = Math.min(windowMs, 5 * 60 * 1000);
  let intervalHandle = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of ipCache.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        ipCache.delete(ip);
      } else {
        ipCache.set(ip, valid);
      }
    }
  }, cleanupMs);

  if (intervalHandle && typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }
  if (activeIntervals && intervalHandle) {
    activeIntervals.push(intervalHandle);
  }

  const limiter = (req, res, next) => {
    if (skipFn && skipFn(req)) {
      return next();
    }

    const rawIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    const timestamps = (ipCache.get(rawIp) || []).filter((t) => now - t < windowMs);
    timestamps.push(now);
    ipCache.set(rawIp, timestamps);

    if (timestamps.length > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil(windowMs / 1000));
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(retryAfterSec));
      }
      if (logger && typeof logger.warn === 'function') {
        logger.warn('[RATE LIMIT EXCEEDED]', {
          ip: rawIp,
          method: req.method,
          url: req.originalUrl,
          requestId: req.id,
        });
      } else {
        console.log(`[RATE LIMIT EXCEEDED] IP: ${rawIp} on ${req.method} ${req.originalUrl}`);
      }
      return res.status(429).json({
        success: false,
        error: customMessage,
        message: customMessage,
        retryAfterSeconds: retryAfterSec,
      });
    }

    return next();
  };

  limiter.stop = () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
    ipCache.clear();
  };

  return limiter;
}

module.exports = {
  createRateLimiter,
};
