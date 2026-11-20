'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  DEFAULT_ADMIN_SESSION_SECRET,
  loadConfig,
  validateRuntimeConfig,
} = require('../src/config/env');
const {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  UpstreamError,
  requestIdMiddleware,
  sendSafeError,
  errorHandlerMiddleware,
} = require('../src/errors/AppError');
const {
  fetchWithTimeout,
  retryTransient,
  CircuitBreaker,
} = require('../src/infra/resilience');
const {
  MAX_IMAGE_UPLOAD_BYTES,
  hashPasswordAsync,
  verifyPasswordAsync,
  isLegacyPasswordHash,
  generateCustomerToken,
  verifyCustomerToken,
  buildSafeS3ImageKey,
  imageUploadFileFilter,
} = require('../src/security/authHelpers');

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    body: null,
    headersSent: false,
    setHeader(k, v) {
      headers[String(k).toLowerCase()] = String(v);
    },
    getHeader(k) {
      return headers[String(k).toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

// ============================================================================
// 1. Config & Environment Validation Tests
// ============================================================================
test('loadConfig returns frozen defaults and debug-route policy by NODE_ENV', () => {
  const devResult = loadConfig({ NODE_ENV: 'development', PUBLIC_STAFF_SELECTOR: 'false' });
  assert.equal(Object.isFrozen(devResult.config), true);
  assert.equal(devResult.config.port, 3000);
  assert.equal(devResult.config.awsRegion, 'us-east-1');
  assert.equal(devResult.config.awsS3Bucket, 'e-menu-products');
  assert.equal(devResult.config.pocketbaseUrl, 'https://crystal-crocodile.pikapod.net');
  assert.equal(devResult.config.customerTokenTtlDays, 30);
  assert.equal(devResult.config.strictConfig, false);
  assert.equal(devResult.config.enableDebugRoutes, true);
  assert.equal(devResult.config.publicStaffSelector, false);
  assert.ok(devResult.warnings.some((w) => w.includes('[SECURITY CONFIG WARNING]')));

  const prodResult = loadConfig({ NODE_ENV: 'production' });
  assert.equal(prodResult.config.enableDebugRoutes, false);

  const explicitDebugProd = loadConfig({ NODE_ENV: 'production', ENABLE_DEBUG_ROUTES: 'true' });
  assert.equal(explicitDebugProd.config.enableDebugRoutes, true);
});

test('validateRuntimeConfig stays Render-compatible without ADMIN_SESSION_SECRET when STRICT_CONFIG is false', () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    const { config } = validateRuntimeConfig({
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://localhost:27017/test_only',
      ADMIN_USER: 'admin',
      ADMIN_PASS: '1234',
    });
    assert.equal(config.adminSessionSecret, DEFAULT_ADMIN_SESSION_SECRET);
    assert.ok(warnings.some((w) => w.includes('[SECURITY CONFIG WARNING]') && w.includes('ADMIN_SESSION_SECRET')));
    assert.ok(warnings.some((w) => w.includes('[SECURITY CONFIG WARNING]') && w.includes('ADMIN_PASS')));
  } finally {
    console.warn = origWarn;
  }
});

test('validateRuntimeConfig throws when MONGO_URI is missing', () => {
  assert.throws(
    () => validateRuntimeConfig({ ADMIN_SESSION_SECRET: 'non-default-secret', ADMIN_PASS: 'strong' }),
    /MONGO_URI/
  );
});

test('STRICT_CONFIG=true enforces non-default ADMIN_SESSION_SECRET and ADMIN_PASS', () => {
  assert.throws(
    () =>
      loadConfig({
        STRICT_CONFIG: 'true',
        ADMIN_PASS: 'strong-password',
      }),
    /ADMIN_SESSION_SECRET/
  );

  assert.throws(
    () =>
      loadConfig({
        STRICT_CONFIG: 'true',
        ADMIN_SESSION_SECRET: DEFAULT_ADMIN_SESSION_SECRET,
        ADMIN_PASS: 'strong-password',
      }),
    /ADMIN_SESSION_SECRET/
  );

  assert.throws(
    () =>
      loadConfig({
        STRICT_CONFIG: 'true',
        ADMIN_SESSION_SECRET: 'super-secret-prod-value',
        ADMIN_PASS: '1234',
      }),
    /ADMIN_PASS/
  );

  const ok = loadConfig({
    STRICT_CONFIG: 'true',
    ADMIN_SESSION_SECRET: 'super-secret-prod-value',
    ADMIN_PASS: 'strong-prod-password',
  });
  assert.equal(ok.config.strictConfig, true);
  assert.equal(ok.config.adminSessionSecret, 'super-secret-prod-value');
});

// ============================================================================
// 2. Typed AppError, Request ID, and Safe Error Masking Tests
// ============================================================================
test('typed AppError hierarchy sets status codes, codes, and retryability', () => {
  const valErr = new ValidationError('حقل مطلوب');
  assert.equal(valErr.statusCode, 400);
  assert.equal(valErr.retryable, false);

  const auth401 = new AuthError();
  assert.equal(auth401.statusCode, 401);
  const auth403 = new AuthError('ممنوع', { statusCode: 403 });
  assert.equal(auth403.statusCode, 403);
  assert.equal(auth403.code, 'FORBIDDEN');

  const notFound = new NotFoundError();
  assert.equal(notFound.statusCode, 404);

  const upstream = new UpstreamError('pb down');
  assert.equal(upstream.statusCode, 502);
  assert.equal(upstream.retryable, true);
});

test('requestIdMiddleware attaches X-Request-Id and preserves valid incoming header', () => {
  const req1 = { headers: {} };
  const res1 = createMockRes();
  let nextCalled = false;
  requestIdMiddleware(req1, res1, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.match(req1.id, /^[0-9a-f-]{36}$/i);
  assert.equal(res1.getHeader('X-Request-Id'), req1.id);

  const req2 = { headers: { 'x-request-id': 'trace-abc-123\r\n' } };
  const res2 = createMockRes();
  requestIdMiddleware(req2, res2, () => {});
  assert.equal(req2.id, 'trace-abc-123');
  assert.equal(res2.getHeader('X-Request-Id'), 'trace-abc-123');
});

test('sendSafeError & errorHandlerMiddleware mask 5xx/upstream internals and log once', () => {
  const logs = [];
  const origError = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const dbErr = new Error('MongoNetworkError: connect ECONNREFUSED 10.0.1.42:27017');
    const req = { id: 'req-500-test', method: 'GET', originalUrl: '/api/orders' };
    const res = createMockRes();

    sendSafeError(res, req, dbErr, { fallbackMessage: 'فشل تنفيذ العملية' });
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'فشل تنفيذ العملية');
    assert.equal(res.body.message, 'فشل تنفيذ العملية');
    assert.equal(res.body.requestId, 'req-500-test');
    assert.equal(res.body.retryable, false);
    assert.equal(res.body.stack, undefined);
    assert.equal(JSON.stringify(res.body).includes('ECONNREFUSED'), false);
    assert.equal(JSON.stringify(res.body).includes('10.0.1.42'), false);
    assert.equal(logs.length, 1);

    // Calling again on same error object does not duplicate logs
    const resAgain = createMockRes();
    sendSafeError(resAgain, req, dbErr, { fallbackMessage: 'فشل تنفيذ العملية' });
    assert.equal(logs.length, 1);

    // UpstreamError also masks internal err.message
    const upstreamErr = new UpstreamError('PocketBase POST /records -> 500: internal sql leak');
    const resUp = createMockRes();
    errorHandlerMiddleware(upstreamErr, req, resUp, () => {});
    assert.equal(resUp.statusCode, 502);
    assert.equal(resUp.body.retryable, true);
    assert.equal(JSON.stringify(resUp.body).includes('sql leak'), false);

    // 400 ValidationError preserves safe domain message
    const valErr = new ValidationError('يجب أن يحتوي الطلب على صنف واحد على الأقل');
    const resVal = createMockRes();
    sendSafeError(resVal, req, valErr);
    assert.equal(resVal.statusCode, 400);
    assert.equal(resVal.body.error, 'يجب أن يحتوي الطلب على صنف واحد على الأقل');
    assert.equal(resVal.body.retryable, false);
  } finally {
    console.error = origError;
  }
});

// ============================================================================
// 3. Resilience Helpers (fetchWithTimeout, retryTransient, CircuitBreaker)
// ============================================================================
test('fetchWithTimeout combines caller signal and enforces timeout', async () => {
  const origFetch = global.fetch;
  try {
    let capturedSignal = null;
    global.fetch = async (_url, opts) => {
      capturedSignal = opts.signal;
      return new Promise((_resolve, reject) => {
        if (opts.signal.aborted) {
          return reject(opts.signal.reason || new Error('Aborted'));
        }
        // Keep a ref'd handle simulating active socket I/O until signal aborts
        const keepAlive = setTimeout(() => {}, 5000);
        opts.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(keepAlive);
            reject(opts.signal.reason || new Error('Aborted'));
          },
          { once: true }
        );
      });
    };

    const controller = new AbortController();
    const pending = fetchWithTimeout('https://example.test/ping', { signal: controller.signal }, 5000);
    assert.ok(capturedSignal instanceof AbortSignal);
    controller.abort(new Error('caller cancelled'));
    await assert.rejects(pending, /caller cancelled/);

    // Also verifies pure timeout expiration
    await assert.rejects(
      fetchWithTimeout('https://example.test/slow', {}, 15),
      (err) => err && (err.name === 'TimeoutError' || /timed out|Abort/i.test(String(err)))
    );
  } finally {
    global.fetch = origFetch;
  }
});

test('retryTransient retries transient errors and never retries deterministic 4xx', async () => {
  let transientCalls = 0;
  const recovered = await retryTransient(
    async () => {
      transientCalls += 1;
      if (transientCalls < 3) {
        const err = new Error('transient 503');
        err.statusCode = 503;
        throw err;
      }
      return 'ok';
    },
    { maxAttempts: 3, baseDelayMs: 0 }
  );
  assert.equal(recovered, 'ok');
  assert.equal(transientCalls, 3);

  for (const status of [400, 401, 403, 404]) {
    let calls = 0;
    await assert.rejects(
      retryTransient(
        async () => {
          calls += 1;
          throw new AppError('client error', { statusCode: status, retryable: false });
        },
        { maxAttempts: 3, baseDelayMs: 0 }
      )
    );
    assert.equal(calls, 1, `status ${status} must not be retried`);
  }
});

test('CircuitBreaker transitions closed -> open -> half-open -> closed and ignores 4xx', async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 25 });
  assert.equal(breaker.state, 'closed');

  // Deterministic 404 must NOT trip the circuit
  for (let i = 0; i < 5; i++) {
    await assert.rejects(
      breaker.exec(async () => {
        throw new AppError('not found', { statusCode: 404, retryable: false });
      })
    );
  }
  assert.equal(breaker.state, 'closed');

  // 3 transient failures open the circuit
  for (let i = 0; i < 3; i++) {
    await assert.rejects(
      breaker.exec(async () => {
        throw new UpstreamError('upstream 502');
      })
    );
  }
  assert.equal(breaker.state, 'open');

  // Calls while open fail fast without invoking fn
  let invokedWhileOpen = false;
  await assert.rejects(
    breaker.exec(async () => {
      invokedWhileOpen = true;
      return 'should-not-run';
    }),
    (err) => err && err.code === 'CIRCUIT_OPEN' && err.statusCode === 503
  );
  assert.equal(invokedWhileOpen, false);

  // Wait for cooldown -> half-open -> probe succeeds -> closed
  await new Promise((r) => setTimeout(r, 35));
  assert.equal(breaker.state, 'half-open');
  const probeResult = await breaker.exec(async () => 'healthy');
  assert.equal(probeResult, 'healthy');
  assert.equal(breaker.state, 'closed');
});

// ============================================================================
// 4. Password Hashing (scrypt + legacy PBKDF2 + plaintext) & Customer Token TTL
// ============================================================================
test('hashPasswordAsync uses scrypt and verifyPasswordAsync supports scrypt, legacy pbkdf2, and plaintext', async () => {
  const scryptHash = await hashPasswordAsync('pass-2026');
  assert.ok(scryptHash.startsWith('scrypt:'));
  assert.equal(scryptHash.split(':').length, 3);
  assert.equal(isLegacyPasswordHash(scryptHash), false);
  assert.equal(await verifyPasswordAsync('pass-2026', scryptHash), true);
  assert.equal(await verifyPasswordAsync('wrong-pass', scryptHash), false);

  // Legacy PBKDF2 format (<salt>:<sha512Hex>)
  const legacySalt = crypto.randomBytes(16).toString('hex');
  const legacyDigest = crypto.pbkdf2Sync('legacy-1234', legacySalt, 10000, 64, 'sha512').toString('hex');
  const legacyHash = `${legacySalt}:${legacyDigest}`;
  assert.equal(isLegacyPasswordHash(legacyHash), true);
  assert.equal(await verifyPasswordAsync('legacy-1234', legacyHash), true);
  assert.equal(await verifyPasswordAsync('wrong-legacy', legacyHash), false);

  // Legacy plaintext fallback when passwordHash is missing
  assert.equal(isLegacyPasswordHash(''), true);
  assert.equal(await verifyPasswordAsync('plain-1234', '', 'plain-1234'), true);
  assert.equal(await verifyPasswordAsync('nope', '', 'plain-1234'), false);
});

test('verifyCustomerToken enforces HMAC signature, phone binding, and TTL expiration', () => {
  const secret = 'unit-test-secret';
  const now = 1_700_000_000_000;
  const token = generateCustomerToken('091-1234567', { secret, now });

  // Valid within 30 days (including Arabic-Indic numeral phone matching)
  assert.equal(
    verifyCustomerToken(token, '٠٩١١٢٣٤٥٦٧', { secret, ttlDays: 30, now: now + 5 * 86400 * 1000 }),
    true
  );

  // Wrong phone rejected
  assert.equal(
    verifyCustomerToken(token, '092-9999999', { secret, ttlDays: 30, now }),
    false
  );

  // Expired beyond TTL rejected
  assert.equal(
    verifyCustomerToken(token, '091-1234567', { secret, ttlDays: 30, now: now + 31 * 86400 * 1000 }),
    false
  );

  // Tampered timestamp / non-finite timestamp rejected
  const badTsToken = Buffer.from('091-1234567:notanumber:abcd:0011').toString('base64');
  assert.equal(verifyCustomerToken(badTsToken, '091-1234567', { secret, ttlDays: 30, now }), false);
});

// ============================================================================
// 5. Image Upload Filter & UUID S3 Key Generation
// ============================================================================
test('imageUploadFileFilter accepts safe raster images and rejects dangerous file types', () => {
  assert.equal(MAX_IMAGE_UPLOAD_BYTES, 15 * 1024 * 1024);

  const runFilter = (file) =>
    new Promise((resolve) => {
      const req = {};
      imageUploadFileFilter(req, file, (err, accepted) => {
        resolve({ err, accepted, req });
      });
    });

  return (async () => {
    const validFiles = [
      { originalname: 'cake.jpg', mimetype: 'image/jpeg' },
      { originalname: 'PHOTO.JPEG', mimetype: 'image/jpeg' },
      { originalname: 'baklawa.png', mimetype: 'image/png' },
      { originalname: 'sweet.webp', mimetype: 'image/webp' },
      { originalname: 'anim.gif', mimetype: 'image/gif' },
    ];

    for (const file of validFiles) {
      const res = await runFilter(file);
      assert.equal(res.err, null);
      assert.equal(res.accepted, true);

      const key = buildSafeS3ImageKey({ originalname: `../../evil-${file.originalname}`, mimetype: file.mimetype });
      assert.match(key, /^products\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$/);
      assert.equal(key.includes('evil'), false);
      assert.equal(key.includes('..'), false);
    }

    const rejectedFiles = [
      { originalname: 'xss.svg', mimetype: 'image/svg+xml' },
      { originalname: 'spoof.svg', mimetype: 'image/png' },
      { originalname: 'page.html', mimetype: 'text/html' },
      { originalname: 'payload.js', mimetype: 'application/javascript' },
      { originalname: 'malware.exe', mimetype: 'application/x-msdownload' },
      { originalname: 'noext', mimetype: 'image/png' },
      { originalname: 'mismatch.png', mimetype: 'image/jpeg' },
    ];

    for (const bad of rejectedFiles) {
      const res = await runFilter(bad);
      assert.ok(res.err instanceof ValidationError, `expected ValidationError for ${bad.originalname}`);
      assert.equal(res.accepted, false);
      assert.ok(res.req.fileValidationError);
    }
  })();
});
