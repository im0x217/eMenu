'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLogger,
  redactSensitive,
  SENSITIVE_KEYS,
  REDACTED_VALUE,
} = require('../src/infra/logger');

test('createLogger emits structured JSON with ts, level, msg, requestId, and meta across levels', () => {
  const entries = [];
  const log = createLogger({
    level: 'debug',
    write: (line) => entries.push(JSON.parse(line)),
  });

  log.debug('debug event', { step: 1 });
  log.info('server started', { port: 3000, requestId: 'req-1' });
  log.warn('slow query', { durationMs: 420 });
  log.error('db failure', { requestId: 'req-2', code: 'ECONNRESET' });

  assert.equal(entries.length, 4);
  assert.deepEqual(
    entries.map((e) => e.level),
    ['debug', 'info', 'warn', 'error']
  );

  for (const entry of entries) {
    assert.ok(typeof entry.ts === 'string' && !Number.isNaN(Date.parse(entry.ts)));
    assert.ok(typeof entry.msg === 'string' && entry.msg.length > 0);
  }

  assert.equal(entries[1].msg, 'server started');
  assert.equal(entries[1].port, 3000);
  assert.equal(entries[1].requestId, 'req-1');
  assert.equal(entries[3].requestId, 'req-2');
  assert.equal(entries[3].code, 'ECONNRESET');
});

test('logger.child merges persistent context and supports chaining and per-call overrides', () => {
  const entries = [];
  const root = createLogger({
    level: 'debug',
    write: (line) => entries.push(JSON.parse(line)),
  });

  const reqLog = root.child({ requestId: 'req-abc', service: 'orders' });
  const shopLog = reqLog.child({ shop: 'shop2' });

  reqLog.info('creating order', { orderNumber: 1005 });
  shopLog.warn('low inventory', { requestId: 'req-override', sku: 'bk-1' });

  assert.equal(entries[0].requestId, 'req-abc');
  assert.equal(entries[0].service, 'orders');
  assert.equal(entries[0].orderNumber, 1005);

  assert.equal(entries[1].requestId, 'req-override');
  assert.equal(entries[1].service, 'orders');
  assert.equal(entries[1].shop, 'shop2');
  assert.equal(entries[1].sku, 'bk-1');
});

test('deep-redacts all sensitive keys recursively without corrupting non-secret telemetry', () => {
  const entries = [];
  const log = createLogger({
    level: 'debug',
    write: (line) => entries.push(JSON.parse(line)),
  });

  const payload = {
    requestId: 'req-sec',
    tokenVersion: 3,
    totalOrders: 12,
    password: 'p1',
    passwordHash: 'scrypt:abc:def',
    plainPassword: 'p2',
    token: 'tok-xyz',
    secret: 'sec-123',
    authorization: 'Bearer header-secret',
    cookie: 'admin_session=signed',
    accessKeyId: 'AKIAEXAMPLE',
    secretAccessKey: 'aws-secret-key',
    nested: {
      headers: {
        Authorization: 'Bearer nested-bearer',
        Cookie: 'session=abc',
      },
      items: [
        { name: 'baklawa', token: 'item-token', price: 25 },
        { secret: 'nested-array-secret' },
      ],
    },
  };

  log.info('auth audit', payload);

  assert.equal(entries.length, 1);
  const logged = entries[0];

  for (const key of SENSITIVE_KEYS) {
    assert.equal(logged[key], REDACTED_VALUE, `expected top-level ${key} to be redacted`);
  }
  assert.equal(logged.nested.headers.Authorization, REDACTED_VALUE);
  assert.equal(logged.nested.headers.Cookie, REDACTED_VALUE);
  assert.equal(logged.nested.items[0].token, REDACTED_VALUE);
  assert.equal(logged.nested.items[0].name, 'baklawa');
  assert.equal(logged.nested.items[0].price, 25);
  assert.equal(logged.nested.items[1].secret, REDACTED_VALUE);

  // Non-secret fields containing partial substrings like tokenVersion remain intact
  assert.equal(logged.tokenVersion, 3);
  assert.equal(logged.totalOrders, 12);
});

test('handles circular references, Error objects, and level filtering safely', () => {
  const entries = [];
  const log = createLogger({
    level: 'warn',
    write: (line) => entries.push(JSON.parse(line)),
  });

  log.debug('ignored debug');
  log.info('ignored info');
  assert.equal(entries.length, 0);

  const circular = { label: 'node' };
  circular.self = circular;
  const err = new Error('upstream failed');
  err.code = 'ETIMEDOUT';
  err.token = 'leak-on-error';

  log.error('caught error', { circular, err });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].circular.self, '[Circular]');
  assert.equal(entries[0].err.message, 'upstream failed');
  assert.equal(entries[0].err.code, 'ETIMEDOUT');
  assert.equal(entries[0].err.token, REDACTED_VALUE);

  const direct = redactSensitive({ a: { b: 1 } });
  assert.deepEqual(direct, { a: { b: 1 } });
});
