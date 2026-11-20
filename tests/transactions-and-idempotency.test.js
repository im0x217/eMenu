'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  withOptionalTransaction,
  createIdempotencyGuard,
} = require('../src/infra/transactions');
const { createRateLimiter } = require('../src/middleware/rateLimit');
const { registerDebugRoutes } = require('../src/domains/debug/routes');
const { registerEmployeeRoutes } = require('../src/domains/employees/routes');

function createMockRes() {
  const headers = {};
  const listeners = new Map();
  const res = {
    statusCode: 200,
    body: undefined,
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
      this.emit('finish');
      return this;
    },
    send(payload) {
      this.body = payload;
      this.headersSent = true;
      this.emit('finish');
      return this;
    },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
      return this;
    },
    emit(event) {
      for (const fn of listeners.get(event) || []) {
        fn();
      }
    },
  };
  return res;
}

// ============================================================================
// 1. withOptionalTransaction
// ============================================================================
test('withOptionalTransaction executes inside session.withTransaction and always closes session', async () => {
  let withTxCalls = 0;
  let endSessionCalls = 0;
  const fakeSession = {
    async withTransaction(fn) {
      withTxCalls += 1;
      return fn();
    },
    async endSession() {
      endSessionCalls += 1;
    },
  };
  const fakeClient = {
    startSession() {
      return fakeSession;
    },
  };

  const result = await withOptionalTransaction(
    () => fakeClient,
    async (session) => {
      assert.equal(session, fakeSession);
      return { ok: true, id: 42 };
    }
  );

  assert.deepEqual(result, { ok: true, id: 42 });
  assert.equal(withTxCalls, 1);
  assert.equal(endSessionCalls, 1);

  // Non-topology error rethrows and still closes session without falling back
  let workCalls = 0;
  await assert.rejects(
    withOptionalTransaction(
      () => fakeClient,
      async () => {
        workCalls += 1;
        throw new Error('ValidationError: invalid amount');
      }
    ),
    /ValidationError/
  );
  assert.equal(workCalls, 1);
  assert.equal(endSessionCalls, 2);
});

test('withOptionalTransaction logs once via logger.warn and falls back to workFn(null) on standalone topology', async () => {
  const warnings = [];
  const spyLogger = {
    warn(msg, meta) {
      warnings.push({ msg, meta });
    },
  };

  let endSessionCalls = 0;
  const standaloneClient = {
    startSession() {
      return {
        async withTransaction(fn) {
          return fn();
        },
        async endSession() {
          endSessionCalls += 1;
        },
      };
    },
  };

  const seenSessions = [];
  const runStandaloneOrder = () =>
    withOptionalTransaction(
      () => standaloneClient,
      async (session) => {
        seenSessions.push(session);
        if (session !== null) {
          const err = new Error('Transaction numbers are only allowed on a replica set member or mongos');
          err.code = 20;
          err.codeName = 'IllegalOperation';
          throw err;
        }
        return 'saved-without-tx';
      },
      spyLogger
    );

  const r1 = await runStandaloneOrder();
  const r2 = await runStandaloneOrder();

  assert.equal(r1, 'saved-without-tx');
  assert.equal(r2, 'saved-without-tx');
  assert.deepEqual(seenSessions, [
    seenSessions[0],
    null,
    seenSessions[2],
    null,
  ]);
  assert.equal(endSessionCalls, 2);
  // Logged once for this client+logger pair instead of spamming every request
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].msg, /TRANSACTION FALLBACK/i);
});

test('withOptionalTransaction falls back cleanly when client or startSession is unavailable', async () => {
  const r1 = await withOptionalTransaction(() => null, async (session) => ({ session }));
  assert.deepEqual(r1, { session: null });

  const r2 = await withOptionalTransaction({}, async (session) => ({ session }));
  assert.deepEqual(r2, { session: null });
});

// ============================================================================
// 2. createIdempotencyGuard
// ============================================================================
test('createIdempotencyGuard passes through when Idempotency-Key header is missing', () => {
  const guard = createIdempotencyGuard({ ttlMs: 60000, maxEntries: 50 });
  try {
    let nextCalls = 0;
    const req = { method: 'POST', path: '/api/orders', headers: {}, ip: '127.0.0.1' };
    const res = createMockRes();
    guard(req, res, () => {
      nextCalls += 1;
    });
    assert.equal(nextCalls, 1);
    assert.equal(guard.size, 0);
  } finally {
    guard.stop();
  }
});

test('createIdempotencyGuard replays completed JSON response with header and returns 409 for in-flight duplicate', async () => {
  const guard = createIdempotencyGuard({ ttlMs: 60000, maxEntries: 50 });
  try {
    let handlerExecutions = 0;
    let releaseFirstRequest;
    const firstInFlight = new Promise((resolve) => {
      releaseFirstRequest = resolve;
    });

    const req1 = {
      method: 'POST',
      path: '/api/orders',
      headers: { 'idempotency-key': 'order-key-123' },
      ip: '10.0.0.1',
    };
    const res1 = createMockRes();

    let firstPromise;
    guard(req1, res1, () => {
      handlerExecutions += 1;
      firstPromise = (async () => {
        await firstInFlight;
        res1.status(201).json({ success: true, orderNumber: 1050 });
      })();
    });

    assert.equal(handlerExecutions, 1);

    // Concurrent request with same key while first is still in-flight -> 409 conflict
    const reqConcurrent = {
      method: 'POST',
      path: '/api/orders',
      headers: { 'idempotency-key': 'order-key-123' },
      ip: '10.0.0.1',
    };
    const resConcurrent = createMockRes();
    let concurrentNextCalled = false;
    guard(reqConcurrent, resConcurrent, () => {
      concurrentNextCalled = true;
    });

    assert.equal(concurrentNextCalled, false);
    assert.equal(resConcurrent.statusCode, 409);
    assert.equal(resConcurrent.body.code, 'IDEMPOTENCY_CONFLICT');
    assert.equal(resConcurrent.body.error, 'جارٍ معالجة نفس الطلب بالفعل');
    assert.equal(resConcurrent.body.message, 'جارٍ معالجة نفس الطلب بالفعل');

    // Complete first request
    releaseFirstRequest();
    await firstPromise;
    assert.equal(res1.statusCode, 201);

    // Retry with same key -> replays 201 and sets Idempotency-Replayed: true
    const reqReplay = {
      method: 'POST',
      path: '/api/orders',
      headers: { 'Idempotency-Key': 'order-key-123' },
      ip: '10.0.0.1',
    };
    const resReplay = createMockRes();
    let replayNextCalled = false;
    guard(reqReplay, resReplay, () => {
      replayNextCalled = true;
    });

    assert.equal(replayNextCalled, false);
    assert.equal(handlerExecutions, 1);
    assert.equal(resReplay.statusCode, 201);
    assert.deepEqual(resReplay.body, { success: true, orderNumber: 1050 });
    assert.equal(resReplay.getHeader('idempotency-replayed'), 'true');

    // Different staff user / IP / path does NOT collide
    const reqOtherActor = {
      method: 'POST',
      path: '/api/orders',
      headers: { 'idempotency-key': 'order-key-123' },
      staffUser: { id: 'staff-99' },
      ip: '10.0.0.1',
    };
    const resOtherActor = createMockRes();
    guard(reqOtherActor, resOtherActor, () => {
      handlerExecutions += 1;
      resOtherActor.status(201).json({ success: true, orderNumber: 1051 });
    });
    assert.equal(handlerExecutions, 2);
    assert.equal(resOtherActor.getHeader('idempotency-replayed'), undefined);
  } finally {
    guard.stop();
  }
});

test('createIdempotencyGuard enforces maxEntries cap and TTL expiration', async () => {
  const guard = createIdempotencyGuard({ ttlMs: 30, maxEntries: 2 });
  try {
    for (const k of ['k1', 'k2', 'k3']) {
      const req = { method: 'POST', path: '/api/admin/payments', headers: { 'idempotency-key': k }, ip: '1.1.1.1' };
      const res = createMockRes();
      guard(req, res, () => res.status(201).json({ key: k }));
    }
    assert.equal(guard.size, 2);

    // Wait past TTL -> k3 expires and re-executes cleanly
    await new Promise((r) => setTimeout(r, 45));
    let reExecuted = false;
    const reqExpired = { method: 'POST', path: '/api/admin/payments', headers: { 'idempotency-key': 'k3' }, ip: '1.1.1.1' };
    const resExpired = createMockRes();
    guard(reqExpired, resExpired, () => {
      reExecuted = true;
      resExpired.status(201).json({ key: 'k3-fresh' });
    });
    assert.equal(reExecuted, true);
    assert.equal(resExpired.getHeader('idempotency-replayed'), undefined);
    assert.deepEqual(resExpired.body, { key: 'k3-fresh' });
  } finally {
    guard.stop();
  }
});

// ============================================================================
// 3. Rate limiter & Debug routes single-$group check
// ============================================================================
test('createRateLimiter enforces limit with Retry-After, honors skip, and cleans up on stop()', () => {
  const activeIntervals = [];
  const limiter = createRateLimiter(60000, 2, {
    activeIntervals,
    skip: (req) => Boolean(req.staffUser),
    message: 'تجاوزت الحد',
    logger: { warn() {} },
  });

  try {
    assert.equal(activeIntervals.length, 1);

    const makeReq = (staffUser = null) => ({
      method: 'POST',
      originalUrl: '/api/orders',
      ip: '192.168.1.50',
      staffUser,
    });

    let passed = 0;
    limiter(makeReq(), createMockRes(), () => { passed += 1; });
    limiter(makeReq(), createMockRes(), () => { passed += 1; });
    assert.equal(passed, 2);

    const blockedRes = createMockRes();
    limiter(makeReq(), blockedRes, () => { passed += 1; });
    assert.equal(passed, 2);
    assert.equal(blockedRes.statusCode, 429);
    assert.equal(blockedRes.body.error, 'تجاوزت الحد');
    assert.ok(Number(blockedRes.getHeader('retry-after')) >= 1);

    // Staff skip bypasses limit
    limiter(makeReq({ id: 'cashier-1' }), createMockRes(), () => { passed += 1; });
    assert.equal(passed, 3);
  } finally {
    limiter.stop();
  }
});

test('registerDebugRoutes uses single $group aggregation in /api/debug/products-by-category without N+1 countDocuments', async () => {
  const routes = new Map();
  const fakeApp = {
    use() {},
    get(path, ...handlers) {
      routes.set(path, handlers[handlers.length - 1]);
    },
  };

  let countDocumentsCalls = 0;
  let aggregateCalls = 0;
  const fakeCategories = [{ name: 'الشرقي' }, { name: 'الغربي' }, { name: 'فارغ' }];

  registerDebugRoutes(fakeApp, {
    isDebugEnabled: () => true,
    getCollections: () => ({
      categoriesCollection: {
        find() {
          return {
            async toArray() {
              return fakeCategories;
            },
          };
        },
      },
      productsCollection: {
        aggregate(pipeline) {
          aggregateCalls += 1;
          assert.ok(pipeline.some((stage) => stage.$group && stage.$group._id === '$category'));
          return {
            async toArray() {
              return [
                { _id: 'الشرقي', count: 7 },
                { _id: 'الغربي', count: 4 },
              ];
            },
          };
        },
        async countDocuments() {
          countDocumentsCalls += 1;
          return 11;
        },
      },
    }),
    middlewares: {
      checkMongoDB: (_req, _res, next) => next(),
      requireGlobalAdmin: (_req, _res, next) => next(),
    },
  });

  const handler = routes.get('/api/debug/products-by-category');
  assert.ok(typeof handler === 'function');

  const res = createMockRes();
  await handler({ id: 'dbg-1', query: {} }, res);

  assert.equal(aggregateCalls, 1);
  assert.equal(countDocumentsCalls, 0);
  assert.deepEqual(res.body, {
    shop: 'shop1',
    categories: { الشرقي: 7, الغربي: 4, فارغ: 0 },
    totalCategories: 3,
    totalProducts: 11,
  });
});

test('registerEmployeeRoutes evaluates collections per-request after mount and bounds transactions limit at 2000', async () => {
  const getRoutes = new Map();
  const postRoutes = new Map();
  const fakeApp = {
    get(path, ...handlers) {
      getRoutes.set(path, handlers);
    },
    post(path, ...handlers) {
      postRoutes.set(path, handlers);
    },
    put() {},
    delete() {},
  };

  // Simulate mount-time state before connectWithRetry() initializes collections/client
  let lateCollections = null;
  let lateClient = null;
  let capturedLimit = null;

  const idempotencyGuard = createIdempotencyGuard({ ttlMs: 60000, maxEntries: 50 });
  try {
    registerEmployeeRoutes(fakeApp, {
      getCollections: () => lateCollections,
      getMongoClient: () => lateClient,
      getNextEmpTxNumber: async () => 1007,
      getOrderEffectiveDateStr: () => '2026-05-01',
      ObjectId: { isValid: (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v) },
      idempotencyGuard,
      middlewares: {
        checkMongoDB: (_req, _res, next) => next(),
        checkStaff: (_req, _res, next) => next(),
        checkAdmin: (_req, _res, next) => next(),
      },
      logger: { warn() {}, error() {} },
    });

    // Populate collections AFTER mount (simulating connectWithRetry completion)
    const txDocs = [{ _id: 'tx1', txNumber: 1001, type: 'bonus', amount: 50 }];
    lateCollections = {
      employeeTransactionsCollection: {
        find() {
          return {
            sort() {
              return {
                limit(n) {
                  capturedLimit = n;
                  return {
                    async toArray() {
                      return txDocs;
                    },
                  };
                },
              };
            },
          };
        },
      },
    };
    lateClient = {};

    const handlers = getRoutes.get('/api/admin/employees/transactions');
    assert.ok(Array.isArray(handlers));
    const handler = handlers[handlers.length - 1];

    const resOverLimit = createMockRes();
    await handler(
      {
        id: 'emp-tx-1',
        query: { limit: '99999' },
        staffUser: { role: 'admin', shopAccess: 'all' },
      },
      resOverLimit
    );
    assert.equal(capturedLimit, 2000);
    assert.equal(resOverLimit.body.success, true);
    assert.deepEqual(resOverLimit.body.transactions, txDocs);

    const resSmallLimit = createMockRes();
    await handler(
      {
        id: 'emp-tx-2',
        query: { limit: '25' },
        staffUser: { role: 'admin', shopAccess: 'all' },
      },
      resSmallLimit
    );
    assert.equal(capturedLimit, 25);
  } finally {
    idempotencyGuard.stop();
  }
});
