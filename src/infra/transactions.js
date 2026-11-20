'use strict';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 2000;

const loggedUnsupportedByClient = new WeakMap();
const fallbackLoggerKey = {};

/**
 * Determine whether a MongoDB error indicates the server topology does not support
 * multi-document transactions (e.g., standalone mongod rather than replica set / mongos).
 * @param {any} err
 * @returns {boolean}
 */
function isTransactionUnsupportedError(err) {
  if (!err || typeof err !== 'object') return false;
  if (err.code === 20 || err.codeName === 'IllegalOperation') {
    return true;
  }
  const msg = String(err.message || '');
  return (
    /replica\s*set/i.test(msg) ||
    /transactions?\s+(?:are\s+)?not\s+supported/i.test(msg) ||
    /does\s+not\s+support\s+transactions/i.test(msg) ||
    /sessions?\s+(?:are\s+)?not\s+supported/i.test(msg) ||
    /standalone.*transaction/i.test(msg)
  );
}

function logUnsupportedTopologyOnce(client, logger, err) {
  if (!logger || typeof logger.warn !== 'function') return;

  const loggerRef = typeof logger === 'object' ? logger : fallbackLoggerKey;
  if (client && typeof client === 'object') {
    let seenLoggers = loggedUnsupportedByClient.get(client);
    if (!seenLoggers) {
      seenLoggers = new WeakSet();
      loggedUnsupportedByClient.set(client, seenLoggers);
    }
    if (seenLoggers.has(loggerRef)) return;
    seenLoggers.add(loggerRef);
  }

  logger.warn('[DB TRANSACTION FALLBACK] Topology does not support transactions; running without session', {
    code: err?.code,
    codeName: err?.codeName,
    reason: err?.message || String(err),
  });
}

/**
 * Execute `workFn(session)` inside a MongoDB transaction when supported by the topology.
 * Cleanly falls back to `workFn(null)` on standalone deployments or when no session-capable
 * client is available. Always closes the session in `finally`.
 *
 * @template T
 * @param {(() => any) | any} getMongoClient
 * @param {(session: any | null) => Promise<T>} workFn
 * @param {{ warn?: (msg: string, meta?: Record<string, any>) => void }} [logger]
 * @returns {Promise<T>}
 */
async function withOptionalTransaction(getMongoClient, workFn, logger) {
  if (typeof workFn !== 'function') {
    throw new TypeError('workFn must be a function');
  }

  const client = typeof getMongoClient === 'function' ? getMongoClient() : getMongoClient;
  if (!client || typeof client.startSession !== 'function') {
    return workFn(null);
  }

  let session = null;
  try {
    session = client.startSession();
  } catch (startErr) {
    if (isTransactionUnsupportedError(startErr)) {
      logUnsupportedTopologyOnce(client, logger, startErr);
      return workFn(null);
    }
    throw startErr;
  }

  if (!session || typeof session.withTransaction !== 'function') {
    if (session && typeof session.endSession === 'function') {
      await session.endSession().catch(() => {});
    }
    return workFn(null);
  }

  let shouldFallback = false;
  let txResult;

  try {
    txResult = await session.withTransaction(async () => workFn(session));
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      shouldFallback = true;
      logUnsupportedTopologyOnce(client, logger, err);
    } else {
      throw err;
    }
  } finally {
    if (typeof session.endSession === 'function') {
      await session.endSession().catch(() => {});
    }
  }

  if (shouldFallback) {
    return workFn(null);
  }

  return txResult;
}

function resolveRequestPath(req) {
  if (!req || typeof req !== 'object') return '/';
  const mounted = `${req.baseUrl || ''}${req.path || ''}`;
  if (mounted) return mounted;
  if (typeof req.originalUrl === 'string' && req.originalUrl) {
    return req.originalUrl.split('?')[0] || '/';
  }
  if (typeof req.url === 'string' && req.url) {
    return req.url.split('?')[0] || '/';
  }
  return '/';
}

function readIdempotencyKeyHeader(req) {
  if (!req || typeof req !== 'object') return '';
  let raw = '';
  if (typeof req.get === 'function') {
    raw = req.get('Idempotency-Key') || req.get('idempotency-key') || '';
  } else if (req.headers && typeof req.headers === 'object') {
    raw = req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || '';
  }
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 256);
}

/**
 * Create an Express idempotency middleware keyed by `method + path + actor + Idempotency-Key`.
 * Missing header calls `next()` untouched. In-flight duplicates receive HTTP 409.
 * Completed <500 responses within TTL replay original status & JSON body with `Idempotency-Replayed: true`.
 *
 * @param {{ ttlMs?: number, maxEntries?: number }} [options]
 */
function createIdempotencyGuard(options = {}) {
  const ttlMs =
    Number.isFinite(options?.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS;
  const maxEntries =
    Number.isInteger(options?.maxEntries) && options.maxEntries > 0
      ? options.maxEntries
      : DEFAULT_MAX_ENTRIES;

  const store = new Map();

  const pruneExpired = () => {
    const now = Date.now();
    for (const [k, entry] of store.entries()) {
      if (entry.state === 'completed' && now - entry.completedAt >= ttlMs) {
        store.delete(k);
      }
    }
  };

  const evictIfFull = () => {
    if (store.size < maxEntries) return;
    pruneExpired();
    if (store.size < maxEntries) return;

    for (const [k, entry] of store.entries()) {
      if (entry.state === 'completed') {
        store.delete(k);
        if (store.size < maxEntries) return;
      }
    }

    while (store.size >= maxEntries) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) break;
      store.delete(oldestKey);
    }
  };

  const cleanupIntervalMs = Math.min(Math.max(1000, Math.floor(ttlMs / 2)), 60 * 1000);
  let cleanupTimer = setInterval(pruneExpired, cleanupIntervalMs);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  const middleware = (req, res, next) => {
    const key = readIdempotencyKeyHeader(req);
    if (!key) {
      return next();
    }

    const method = String(req.method || 'POST').toUpperCase();
    const reqPath = resolveRequestPath(req);
    const actor = req.staffUser?.id || req.ip || req.socket?.remoteAddress || 'anon';
    const compositeKey = `${method}:${reqPath}:${actor}:${key}`;

    const existing = store.get(compositeKey);
    if (existing) {
      if (existing.state === 'completed' && Date.now() - existing.completedAt >= ttlMs) {
        store.delete(compositeKey);
      } else if (existing.state === 'in-flight') {
        return res.status(409).json({
          success: false,
          error: 'جارٍ معالجة نفس الطلب بالفعل',
          message: 'جارٍ معالجة نفس الطلب بالفعل',
          code: 'IDEMPOTENCY_CONFLICT',
          ...(req.id ? { requestId: req.id } : {}),
        });
      } else if (existing.state === 'completed') {
        if (typeof res.setHeader === 'function' && !res.headersSent) {
          res.setHeader('Idempotency-Replayed', 'true');
        }
        if (existing.isJson || typeof res.json === 'function') {
          return res.status(existing.statusCode).json(existing.body);
        }
        if (typeof res.send === 'function') {
          return res.status(existing.statusCode).send(existing.body);
        }
        return;
      }
    }

    evictIfFull();
    store.set(compositeKey, {
      state: 'in-flight',
      createdAt: Date.now(),
    });

    let finalized = false;
    let capturedFromJson = false;

    const origJson = typeof res.json === 'function' ? res.json.bind(res) : null;
    const origSend = typeof res.send === 'function' ? res.send.bind(res) : null;

    const recordResponse = (statusCode, payload, isJson) => {
      if (finalized) return;
      finalized = true;
      const numericStatus = Number.isInteger(statusCode) ? statusCode : 200;
      if (numericStatus >= 500) {
        store.delete(compositeKey);
        return;
      }
      store.set(compositeKey, {
        state: 'completed',
        statusCode: numericStatus,
        body: payload,
        isJson,
        completedAt: Date.now(),
      });
    };

    if (origJson) {
      res.json = (body) => {
        capturedFromJson = true;
        recordResponse(res.statusCode || 200, body, true);
        return origJson(body);
      };
    }

    if (origSend) {
      res.send = (body) => {
        if (!capturedFromJson) {
          recordResponse(res.statusCode || 200, body, false);
        }
        return origSend(body);
      };
    }

    if (typeof res.on === 'function') {
      const cleanupIfAborted = () => {
        if (!finalized) {
          finalized = true;
          store.delete(compositeKey);
        }
      };
      res.on('close', cleanupIfAborted);
      res.on('finish', () => {
        if (!finalized) {
          finalized = true;
          store.delete(compositeKey);
        }
      });
    }

    try {
      return next();
    } catch (err) {
      if (!finalized) {
        finalized = true;
        store.delete(compositeKey);
      }
      throw err;
    }
  };

  middleware.stop = () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };

  middleware.clear = () => {
    store.clear();
  };

  Object.defineProperty(middleware, 'size', {
    get() {
      return store.size;
    },
  });

  return middleware;
}

module.exports = {
  DEFAULT_TTL_MS,
  DEFAULT_MAX_ENTRIES,
  isTransactionUnsupportedError,
  withOptionalTransaction,
  createIdempotencyGuard,
};
