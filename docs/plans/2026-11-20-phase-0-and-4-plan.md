# e-Menu Phase 0 Hardening & Phase 4 Hygiene Implementation Plan

> **Execution note:** Track progress by checking off `- [ ]` steps in this plan or in an Antigravity task artifact. Complete backend infrastructure Tasks 1–5 sequentially (each builds on earlier `Interfaces`); frontend/tokens Tasks 6–8 and workspace hygiene Task 9 can run in parallel branches before Task 10 integration verification.

**Goal:** Deliver Phase 0 security, error-handling, resilience, and WCAG/token hardening alongside Phase 4 workspace skill and engineering documentation hygiene with zero regressions to live Shop 1 (`emenu`), Shop 2 (`emenu2` + PocketBase), or Render deploys.

**Architecture:** Extract pure, dependency-light backend infrastructure modules (`src/config/env.js`, `src/errors/AppError.js`, `src/infra/resilience.js`, `src/security/authHelpers.js`) using Node stdlib CommonJS and wire them into [`server.js`](../../server.js) before any domain router split. In parallel, fix cyclic token generation, clear all `scripts/ux-audit.js` findings, add frontend fetch resilience (`apiClient.js`), bump the PWA cache (`v236`), and rationalize `.agents/skills/` and `docs/`.

**Tech Stack:** Node.js (`node:test`, `node:assert/strict`, `node:crypto`), Express 4, MongoDB Driver 6, AWS SDK v3 (`@aws-sdk/client-s3`), Multer S3, Vue 3 + Vite + Pinia + Vue Router, W3C DTCG `tokens.json`, PowerShell 5.1 / bash.

**Spec:** [`docs/specs/2026-11-20-emenu-hardening-and-hygiene-design.md`](../specs/2026-11-20-emenu-hardening-and-hygiene-design.md)

---

## File Map

### Phase 0 — Backend Hardening
- Create: `src/config/env.js` — Centralized schema, defaults, and Render-safe warnings for all 14 existing + 3 hardening env vars.
- Create: `src/errors/AppError.js` — Typed error hierarchy, `requestIdMiddleware`, `sendSafeError`, and 4-arg `errorHandlerMiddleware`.
- Create: `src/infra/resilience.js` — `fetchWithTimeout`, `retryTransient`, and `CircuitBreaker` for outbound HTTP (PocketBase).
- Create: `src/security/authHelpers.js` — Async `scrypt` hashing + legacy PBKDF2/plain verification, customer token TTL checks, and raster image upload validation.
- Modify: `server.js` — Wire config/errors/resilience/auth helpers, `trust proxy`, `15 MB` UUID raster upload filter, replace 11 `.catch(() => {})` calls and 18 `err.message` leaks, gate `/api/debug/*`, harden Mongo/S3 timeouts, add `/api/ready`, and implement `SIGTERM`/`SIGINT` graceful shutdown.
- Modify: `.env.example` — Document all 17 environment variables without secrets.
- Modify: `package.json` — Add `"test": "node --test tests/*.test.js"`.
- Test: `tests/backend-hardening.test.js` — Standalone Node unit/contract tests covering `src/` without `node_modules` or live DB access.

### Phase 0 — Frontend, Tokens & WCAG Fixes
- Modify: `scripts/build-tokens.js` — Remove cyclic `--touch-target-*` self-references (lines 108–109).
- Regenerate: `frontend/src/tokens/tokens.css`, `frontend/src/tokens/tokens.js` — Acyclic compiled token outputs.
- Modify: `design-system/e-menu/MASTER.md` — Align drifted hexes (`#f7f3ec`, `#fffdf9`, `#685f58`) with `tokens.json` and document `npm run tokens:build`.
- Modify: `frontend/src/components/AdminCarouselTab.vue` — Add missing image `alt` and file input `aria-label`.
- Modify: `frontend/src/components/AdminEmployeesTab.vue` — Add `aria-hidden="true"` to 11 decorative SVGs, `:aria-label` on 2 chef checkboxes, and `>= 44px` hit boxes for `.emp-month-arrow` and `.emp-filter-pill`.
- Modify: `frontend/src/components/AdminShortcutsModal.vue` — Expand `.modal-close-btn` touch hit box (`>= 44px`).
- Modify: `frontend/src/components/InventoryTab.vue` — Expand `.inv-stepper-btn` touch hit box (`>= 44px`) and replace empty catch (line 1473).
- Modify: `frontend/src/components/RtlDatePicker.vue` — Expand `.dp-footer-btn` touch hit box (`>= 44px`).
- Modify: `frontend/src/views/AccountView.vue` — Expand `.btn-confirm-received-subtle` and `.btn-edit-order-subtle` hit boxes (`>= 44px`).
- Create: `frontend/src/utils/apiClient.js` — `fetchWithTimeout`, `parseApiError`, and Arabic `normalizeFetchError`.
- Modify: `frontend/src/router/index.js`, `frontend/src/stores/shop.js`, `frontend/src/views/AdminView.vue`, `frontend/src/views/ShopView.vue` — Replace remaining 14 empty `catch` blocks with structured `console.warn`.
- Modify: `public/sw.js` — Bump `CACHE_NAME` from `'emenu-cache-v235'` to `'emenu-cache-v236'`.

### Phase 4 — Skill Governance & Engineering Docs
- Delete: `SKILL.md` — Remove stray root duplicate of `.agents/skills/apple-design/SKILL.md`.
- Replace: `.agents/skills/taste-skill/` -> `.agents/skills/generating-mobile-mockups/` (`SKILL.md` `<300` lines + `references/`).
- Modify: `.agents/skills/apple-design/SKILL.md` — Polish frontmatter/paths and add Vue integration checklist.
- Create: `.agents/skills/applying-emenu-brand/` (`SKILL.md` + `resources/`), `.agents/skills/releasing-emenu/SKILL.md`, `.agents/skills/auditing-emenu-db/SKILL.md`.
- Create: `docs/README.md`, `docs/adr/0001-multi-tenant-db-and-pocketbase.md`, `docs/adr/0002-backend-modularization.md`, `docs/adr/0003-vue-dtcg-design-system.md`, `docs/specs/2026-11-20-emenu-hardening-and-hygiene-design.md`, `docs/plans/2026-11-20-phase-0-and-4-plan.md`.

---

## Global Constraints

- **Render backward compatibility:** Startup must warn (`[SECURITY CONFIG WARNING]`) when `ADMIN_SESSION_SECRET` is omitted unless `STRICT_CONFIG === 'true'`; throw fatally only if `MONGO_URI` is missing or `STRICT_CONFIG === 'true'` detects weak defaults.
- **Error JSON compatibility:** Preserve `.error` alongside `{ code, message, requestId, retryable }` on every error response; never leak `err.stack`, internal scripts (`create-s3-bucket.js`), or raw 5xx/DB/PocketBase messages.
- **Worktree-safe unit tests:** `src/` modules and `tests/backend-hardening.test.js` must import only Node stdlib (`node:test`, `node:assert/strict`, `node:crypto`)—never `express` or `mongodb`—and never mutate live MongoDB (`emenu`/`emenu2`) or PocketBase.
- **Audit integrity:** Never edit `scripts/ux-audit.js` to suppress warnings; fix the underlying Vue templates and CSS hit boxes cleanly while preserving Arabic RTL layout.
- **Verification safety:** Never kill processes on port `3000`; run live HTTP smoke checks on dedicated port `3006` with `try/finally` cleanup, and never read/print `.env` secrets or push unverified commits.

---

## Review Focus

1. **Render boot crash when `ADMIN_SESSION_SECRET` is unset:** Render `e-menu-secrets` omits `ADMIN_SESSION_SECRET`; defaulting `STRICT_CONFIG` to `'true'` or throwing unconditionally in `loadConfig` breaks production deploys. *Pinned in Task 1 (`loadConfig` & `validateRuntimeConfig` strict vs non-strict tests).*
2. **Silent `Promise` truthiness or customer lockout on async `scrypt` upgrade:** Forgetting `await` on `verifyPasswordAsync` turns every non-null Promise into `true`, or failing to read legacy `<salt>:<pbkdf2Hex>` / `storedPlain` locks out existing customers. *Pinned in Task 4 (async `scrypt`, PBKDF2, and `storedPlain` verification tests) & Task 5 (caller `await` verification).*
3. **PocketBase retry storm on deterministic 4xx or missing `.error` field:** Retrying `400`/`404` responses multiplies latency during checkout; omitting `.error` breaks existing Vue frontend error alerts. *Pinned in Task 2 (`sendSafeError` shape test) & Task 3 (`retryTransient` no-retry-on-4xx test).*
4. **Upload MIME/extension bypass (`.svg`/`.html`/`.exe`) reaching S3:** Checking only `file.mimetype` or sanitizing keys inside S3 `key()` allows `.svg` XSS uploads or leaks `file.originalname`. *Pinned in Task 4 (`validateImageUpload` rejection tests) & Task 5 (`multer` `fileFilter` + `15 MB` wiring).*
5. **Cyclic CSS custom property or `ux-audit.js` hit-box regex mismatch:** Self-referential `--touch-target-min: var(--touch-target-min)` invalidates the token at runtime, and compact buttons without a matching `::before`/`::after` `>= 44px` rule keep failing `scripts/ux-audit.js`. *Pinned in Task 6 (`tokens.css` self-reference check) & Task 7 (`node scripts/ux-audit.js` 0 Errors / 0 Warnings).*

---

## Phase 0 & Phase 4 Tasks

### Task 1: Centralized Environment Config & Render-Safe Validation

**Files:**
- Create: `src/config/env.js`
- Modify: `.env.example`
- Test: `tests/backend-hardening.test.js`

**Interfaces:**
- Consumes: None
- Produces:
  - `loadConfig(env = process.env) => { config: Readonly<object>, warnings: string[] }`
  - `validateRuntimeConfig(env = process.env) => Readonly<object>`

- [ ] **Step 1: Write the failing test**

In `tests/backend-hardening.test.js`, add tests asserting:
```js
const { loadConfig, validateRuntimeConfig } = require('../src/config/env');

test('loadConfig warns instead of throwing when ADMIN_SESSION_SECRET is unset and STRICT_CONFIG is false', () => {
  const { config, warnings } = loadConfig({ MONGO_URI: 'mongodb://localhost:27017/emenu' });
  assert.equal(config.port, 3000);
  assert.equal(config.customerTokenTtlDays, 30);
  assert.equal(config.strictConfig, false);
  assert.ok(Object.isFrozen(config));
  assert.ok(warnings.some((w) => w.includes('ADMIN_SESSION_SECRET')));
});

test('validateRuntimeConfig throws when MONGO_URI is missing or STRICT_CONFIG rejects defaults', () => {
  assert.throws(() => validateRuntimeConfig({}), /MONGO_URI/);
  assert.throws(
    () => validateRuntimeConfig({ MONGO_URI: 'mongodb://localhost/x', STRICT_CONFIG: 'true', ADMIN_PASS: '1234' }),
    /STRICT_CONFIG/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/backend-hardening.test.js`
Expected: FAIL (`Cannot find module '../src/config/env'`).

- [ ] **Step 3: Implement `loadConfig` and `validateRuntimeConfig` in `src/config/env.js` and update `.env.example`**

Centralize all 14 existing `process.env` vars (`MONGO_URI`, `PORT`, `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_SESSION_SECRET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DOMAIN`, `POCKETBASE_URL`, `BACKUP_DIR`, `BULK_CODE`, `PUBLIC_STAFF_SELECTOR`) plus `CUSTOMER_TOKEN_TTL_DAYS` (`30`), `STRICT_CONFIG` (`'false'`), and `ENABLE_DEBUG_ROUTES` (`false` in `production`, `true` otherwise). Emit `[SECURITY CONFIG WARNING]` logs in `validateRuntimeConfig` when non-strict defaults are active; document all vars in `.env.example`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/backend-hardening.test.js`
Expected: PASS (Task 1 config tests green).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.js .env.example tests/backend-hardening.test.js
git commit -m "feat(config): centralize env validation with Render-safe warnings"
```

---

### Task 2: Typed `AppError` Hierarchy & Request-Scoped Error Serialization

**Files:**
- Create: `src/errors/AppError.js`
- Test: `tests/backend-hardening.test.js`

**Interfaces:**
- Consumes: None
- Produces:
  - `AppError(message, { code, statusCode, retryable, details, cause })`
  - `ValidationError`, `AuthError`, `NotFoundError`, `UpstreamError`
  - `requestIdMiddleware(req, res, next)`
  - `sendSafeError(res, req, err, { fallbackMessage, statusCode, code })`
  - `errorHandlerMiddleware(err, req, res, next)`

- [ ] **Step 1: Write the failing test**

In `tests/backend-hardening.test.js`, add assertions with mock `req`/`res` objects:
```js
const { AppError, ValidationError, UpstreamError, requestIdMiddleware, sendSafeError } = require('../src/errors/AppError');

test('sendSafeError masks 5xx internals while preserving .error for frontend compatibility', () => {
  const err = new Error('ECONNREFUSED 10.0.0.5:27017 stack leak');
  // Mock res capturing statusCode, headers, and json payload
  sendSafeError(mockRes, { id: 'req-123', method: 'GET', originalUrl: '/api/test' }, err, {
    fallbackMessage: 'تعذر إتمام الطلب، يرجى المحاولة لاحقاً'
  });
  assert.equal(mockRes.statusCode, 500);
  assert.equal(mockRes.body.error, 'تعذر إتمام الطلب، يرجى المحاولة لاحقاً');
  assert.equal(mockRes.body.message, 'تعذر إتمام الطلب، يرجى المحاولة لاحقاً');
  assert.equal(mockRes.body.requestId, 'req-123');
  assert.equal('stack' in mockRes.body, false);
});

test('sendSafeError preserves domain ValidationError message on 400 and UpstreamError retryable flag', () => {
  sendSafeError(mockRes400, { id: 'req-400' }, new ValidationError('الكمية غير صالحة'));
  assert.equal(mockRes400.statusCode, 400);
  assert.equal(mockRes400.body.error, 'الكمية غير صالحة');
  assert.equal(new UpstreamError('pb down').retryable, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/backend-hardening.test.js`
Expected: FAIL (`Cannot find module '../src/errors/AppError'`).

- [ ] **Step 3: Implement `src/errors/AppError.js`**

Implement typed error subclasses (`ValidationError` `400`, `AuthError` `401`/`403`, `NotFoundError` `404`, `UpstreamError` `502`/`503` with `retryable: true`), `requestIdMiddleware` using `req.headers['x-request-id'] || crypto.randomUUID()` and `X-Request-Id` response header, single-log `sendSafeError` returning `{ error, code, message, requestId, retryable }`, and 4-arg `errorHandlerMiddleware`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/backend-hardening.test.js`
Expected: PASS (Task 1 + Task 2 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/errors/AppError.js tests/backend-hardening.test.js
git commit -m "feat(errors): add AppError hierarchy, requestIdMiddleware, and sendSafeError"
```

---

### Task 3: Outbound HTTP Timeouts, Selective Retries & Circuit Breaker

**Files:**
- Create: `src/infra/resilience.js`
- Test: `tests/backend-hardening.test.js`

**Interfaces:**
- Consumes: `UpstreamError` from `src/errors/AppError.js`
- Produces:
  - `fetchWithTimeout(url, options = {}, timeoutMs = 8000) => Promise<Response>`
  - `retryTransient(fn, { maxAttempts = 3, baseDelayMs = 250, isRetryable }) => Promise<any>`
  - `CircuitBreaker({ failureThreshold = 5, cooldownMs = 30000 })` (`exec(fn)`, `getState()`)

- [ ] **Step 1: Write the failing test**

In `tests/backend-hardening.test.js`, add tests verifying:
```js
const { retryTransient, CircuitBreaker, fetchWithTimeout } = require('../src/infra/resilience');

test('retryTransient retries transient 503 then succeeds, never retries deterministic 400', async () => {
  let attempts = 0;
  const result = await retryTransient(async () => {
    attempts++;
    if (attempts < 3) throw Object.assign(new Error('503'), { statusCode: 503 });
    return 'ok';
  }, { maxAttempts: 3, baseDelayMs: 5 });
  assert.equal(result, 'ok');
  assert.equal(attempts, 3);

  let badAttempts = 0;
  await assert.rejects(
    () => retryTransient(async () => { badAttempts++; throw Object.assign(new Error('400'), { statusCode: 400 }); }, { maxAttempts: 3, baseDelayMs: 5 }),
    { statusCode: 400 }
  );
  assert.equal(badAttempts, 1);
});

test('CircuitBreaker opens after threshold failures and throws retryable UpstreamError', async () => {
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000 });
  await assert.rejects(() => breaker.exec(async () => { throw new Error('boom'); }));
  await assert.rejects(() => breaker.exec(async () => { throw new Error('boom'); }));
  assert.equal(breaker.getState(), 'open');
  await assert.rejects(() => breaker.exec(async () => 'never'), (err) => err.statusCode === 503 && err.retryable === true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/backend-hardening.test.js`
Expected: FAIL (`Cannot find module '../src/infra/resilience'`).

- [ ] **Step 3: Implement `src/infra/resilience.js`**

Implement `fetchWithTimeout` using `AbortSignal.timeout(timeoutMs)` (merged with `options.signal` via `AbortSignal.any` if provided), `retryTransient` with exponential backoff + jitter (defaulting `isRetryable` to `false` on HTTP `400`–`499` except `429`), and `CircuitBreaker` (`closed`/`open`/`half-open`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/backend-hardening.test.js`
Expected: PASS (Tasks 1–3 tests green).

- [ ] **Step 5: Commit**

```bash
git add src/infra/resilience.js tests/backend-hardening.test.js
git commit -m "feat(resilience): add fetchWithTimeout, retryTransient, and CircuitBreaker"
```

---

### Task 4: Async `scrypt` Auth Helpers, Token TTL & Upload Validation

**Files:**
- Create: `src/security/authHelpers.js`
- Test: `tests/backend-hardening.test.js`

**Interfaces:**
- Consumes: None
- Produces:
  - `hashPasswordAsync(password) => Promise<string>`
  - `verifyPasswordAsync(password, storedHash, storedPlain, hmacSecret?) => Promise<boolean>`
  - `needsPasswordRehash(storedHash) => boolean`
  - `generateCustomerToken(phone, secret, nowMs?) => string`
  - `verifyCustomerToken(token, expectedPhone, { secret, ttlDays = 30, nowMs? }) => boolean`
  - `validateImageUpload(mimetype, originalname) => { ok: boolean, ext?: string, reason?: string }`

- [ ] **Step 1: Write the failing test**

In `tests/backend-hardening.test.js`, add assertions covering Review Focus #2 & #4:
```js
const {
  hashPasswordAsync, verifyPasswordAsync, needsPasswordRehash,
  generateCustomerToken, verifyCustomerToken, validateImageUpload
} = require('../src/security/authHelpers');

test('scrypt hashes verify cleanly and legacy PBKDF2/plaintext passwords remain backwards-compatible', async () => {
  const scryptHash = await hashPasswordAsync('pass-2026');
  assert.ok(scryptHash.startsWith('scrypt:'));
  assert.equal(await verifyPasswordAsync('pass-2026', scryptHash, null, 'sec'), true);
  assert.equal(await verifyPasswordAsync('wrong', scryptHash, null, 'sec'), false);
  assert.equal(needsPasswordRehash(scryptHash), false);

  const salt = '0011223344556677';
  const pbkdf2Hex = crypto.pbkdf2Sync('legacy123', salt, 10000, 64, 'sha512').toString('hex');
  assert.equal(await verifyPasswordAsync('legacy123', `${salt}:${pbkdf2Hex}`, null, 'sec'), true);
  assert.equal(needsPasswordRehash(`${salt}:${pbkdf2Hex}`), true);
  assert.equal(await verifyPasswordAsync('plain99', null, 'plain99', 'sec'), true);
});

test('verifyCustomerToken rejects expired tokens past ttlDays and validateImageUpload rejects svg/html/exe', () => {
  const now = 1_700_000_000_000;
  const token = generateCustomerToken('091-1234567', 'sec', now);
  assert.equal(verifyCustomerToken(token, '0911234567', { secret: 'sec', ttlDays: 30, nowMs: now + 1000 }), true);
  assert.equal(verifyCustomerToken(token, '0911234567', { secret: 'sec', ttlDays: 30, nowMs: now + 31 * 86400_000 }), false);

  assert.equal(validateImageUpload('image/png', 'cake.PNG').ok, true);
  assert.equal(validateImageUpload('image/svg+xml', 'xss.svg').ok, false);
  assert.equal(validateImageUpload('text/html', 'bad.html').ok, false);
  assert.equal(validateImageUpload('application/x-msdownload', 'evil.exe').ok, false);
  assert.equal(validateImageUpload('image/png', 'fake.svg').ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/backend-hardening.test.js`
Expected: FAIL (`Cannot find module '../src/security/authHelpers'`).

- [ ] **Step 3: Implement `src/security/authHelpers.js`**

Implement `crypto.scrypt` async hashing/verification with `crypto.timingSafeEqual`, legacy `<salt>:<pbkdf2Hex>` and `storedPlain` compatibility, `needsPasswordRehash`, TTL-enforced `verifyCustomerToken`, and `validateImageUpload` restricting uploads to `image/jpeg`, `image/png`, `image/webp`, `image/gif` with matching lowercase extensions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/backend-hardening.test.js`
Expected: PASS (all unit tests in `tests/backend-hardening.test.js` green).

- [ ] **Step 5: Commit**

```bash
git add src/security/authHelpers.js tests/backend-hardening.test.js
git commit -m "feat(security): add async scrypt, token TTL, and raster upload validation"
```

---

### Task 5: Wire Hardening, Error Boundaries & Lifecycle into `server.js`

**Files:**
- Modify: `server.js:15-153,270-335,420-435,548-563,997-1055,1266-1410,1653-2436,3153-4215,5150-5410,5849-6260,7980-8382`
- Modify: `package.json:5-11`

**Interfaces:**
- Consumes: `loadConfig`, `validateRuntimeConfig` (Task 1); `AppError` classes, `requestIdMiddleware`, `sendSafeError`, `errorHandlerMiddleware` (Task 2); `fetchWithTimeout`, `retryTransient`, `CircuitBreaker` (Task 3); `hashPasswordAsync`, `verifyPasswordAsync`, `needsPasswordRehash`, `generateCustomerToken`, `verifyCustomerToken`, `validateImageUpload` (Task 4)
- Produces: Hardened `server.js` exporting zero raw `err.message` leaks, zero `.catch(() => {})` swallows, `/api/ready`, and `"test": "node --test tests/*.test.js"` in `package.json`

- [ ] **Step 1: Write failing static/contract checks**

Verify current gaps in `server.js` before editing:
- Check `.catch(() => {})` count (`11`), raw `err.message` HTTP response count (`18`), `multer` limit (`100 * 1024 * 1024`), and missing `/api/ready`.

- [ ] **Step 2: Run baseline verification to confirm gaps exist**

Run (PowerShell):
`node --check server.js; (Select-String -Path server.js -Pattern '\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)').Count; (Select-String -Path server.js -Pattern 'res\.status\([^)]+\)\.json\([^)]*err\.message').Count`
Expected: `0` exit, counts `11` and `18`.

- [ ] **Step 3: Wire modules & hardening into `server.js` and add `"test"` script in `package.json`**

1. Boot `validateRuntimeConfig()` at startup; pass `config.mongoUri`, `config.adminSessionSecret`, `config.pocketbaseUrl`, etc.
2. Add `app.set('trust proxy', 1)` right after `const app = express();` and mount `requestIdMiddleware` before `/api`.
3. Convert all async customer/staff auth callers (`register`, `login`, `set-password`, `admin/customers`, `reset-password`, `admin/users`, startup seeding/migration) to `await hashPasswordAsync` / `await verifyPasswordAsync` with transparent rehash-on-login (`needsPasswordRehash`), and pass `ttlDays: config.customerTokenTtlDays` into `verifyCustomerToken`.
4. Update `multer` / `uploadErrorHandler`: UUID key (`products/${crypto.randomUUID()}${ext}`), `validateImageUpload` `fileFilter`, `15 * 1024 * 1024` limit, Arabic `sendSafeError` responses (removing `create-s3-bucket.js` hint).
5. Replace all **11** `.catch(() => {})` swallows (`Promise.allSettled` + `[CASCADE WARN]` / `[DB INDEX WARN]`) and all **18** raw `err.message` HTTP responses (`sendSafeError`, converting domain 400 throws to `ValidationError`). Gate `/api/debug/*` routes on `config.enableDebugRoutes`.
6. Wrap `pbFetch` with `pbCircuitBreaker.exec` + `retryTransient` (GET/transient only) + `fetchWithTimeout(..., 8000)`. Add `MongoClient` timeouts/pool (`serverSelectionTimeoutMS: 10000`, `connectTimeoutMS: 10000`, `socketTimeoutMS: 45000`, `maxPoolSize: 20`), capped backoff + jitter on `connectWithRetry`, and `S3Client({ ..., maxAttempts: 3 })`.
7. Quiet `/api/health`, add `GET /api/ready` (`db.admin().ping()` returning `200`/`503`), track all `setInterval` handles + `httpServer`, add `SIGTERM`/`SIGINT` graceful shutdown (10s force-exit timer), make `uncaughtException` shut down and exit `1`, mount `errorHandlerMiddleware` last, and add `"test": "node --test tests/*.test.js"` to `package.json`.

- [ ] **Step 4: Run syntax, static leak checks, and unit tests**

Run (PowerShell):
`node --check server.js; if ($LASTEXITCODE -eq 0) { node --test tests/backend-hardening.test.js }`
AND check `(Select-String -Path server.js -Pattern '\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)').Count` and `(Select-String -Path server.js -Pattern 'res\.status\([^)]+\)\.json\([^)]*err\.message').Count`.
Expected: `node --check` exit `0`, all `tests/backend-hardening.test.js` pass, both counts `0`.

- [ ] **Step 5: Commit**

```bash
git add server.js package.json
git commit -m "feat(server): wire hardening modules, safe errors, resilience, and graceful shutdown"
```

---

### Task 6: Fix Cyclic CSS Tokens & Reconcile `MASTER.md`

**Files:**
- Modify: `scripts/build-tokens.js:108-109`
- Regenerate: `frontend/src/tokens/tokens.css`, `frontend/src/tokens/tokens.js`
- Modify: `design-system/e-menu/MASTER.md`

**Interfaces:**
- Consumes: `frontend/src/tokens/tokens.json`
- Produces: Acyclic `frontend/src/tokens/tokens.css` & `frontend/src/tokens/tokens.js`; reconciled `design-system/e-menu/MASTER.md` (`#f7f3ec`, `#fffdf9`, `#685f58`)

- [ ] **Step 1: Write/verify the failing cyclic-token check**

Run (PowerShell):
`Select-String -Path frontend\src\tokens\tokens.css -Pattern '--touch-target-min:\s*var\(--touch-target-min\)'`
Expected: Match found at line 61 (confirms cyclic bug prior to fix).

- [ ] **Step 2: Verify baseline drift in `MASTER.md`**

Run (PowerShell):
`Select-String -Path design-system\e-menu\MASTER.md -Pattern '#faf7f2|#6c757d'`
Expected: Matches found prior to fix.

- [ ] **Step 3: Fix `scripts/build-tokens.js`, run compiler, and reconcile `MASTER.md`**

1. Remove lines 108–109 (`--touch-target-min: var(--touch-target-min);` and `--touch-target-clearance: var(--touch-target-clearance);`) in `scripts/build-tokens.js` (keeping global `--touch-target-min: 48px;` and `--touch-target-clearance: 8px;`).
2. Run `node scripts/build-tokens.js`.
3. Update `design-system/e-menu/MASTER.md` to match `tokens.json` (`#f7f3ec`, `#fffdf9`, `#685f58`) and reference `frontend/src/tokens/tokens.json` + `npm run tokens:build`.

- [ ] **Step 4: Run verification checks**

Run (PowerShell):
`node scripts/build-tokens.js; if ($LASTEXITCODE -eq 0) { Select-String -Path frontend\src\tokens\tokens.css -Pattern 'var\(--touch-target-' }`
Expected: `0` matches for cyclic self-references in `tokens.css` and `0` `#faf7f2`/`#6c757d` matches in `MASTER.md`.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-tokens.js frontend/src/tokens/tokens.css frontend/src/tokens/tokens.js design-system/e-menu/MASTER.md
git commit -m "fix(tokens): eliminate cyclic touch-target variables and reconcile MASTER.md"
```

---

### Task 7: Fix All WCAG 2.1 & Touch-Target Findings in `scripts/ux-audit.js`

**Files:**
- Modify: `frontend/src/components/AdminCarouselTab.vue:69,130`
- Modify: `frontend/src/components/AdminEmployeesTab.vue` (11 SVGs, lines 923 & 938 checkboxes, `.emp-month-arrow` & `.emp-filter-pill` CSS)
- Modify: `frontend/src/components/AdminShortcutsModal.vue` (`.modal-close-btn` CSS)
- Modify: `frontend/src/components/InventoryTab.vue` (`.inv-stepper-btn` CSS)
- Modify: `frontend/src/components/RtlDatePicker.vue` (`.dp-footer-btn` CSS)
- Modify: `frontend/src/views/AccountView.vue` (`.btn-confirm-received-subtle` & `.btn-edit-order-subtle` CSS)

**Interfaces:**
- Consumes: `scripts/ux-audit.js` (unmodified)
- Produces: Zero audit errors and zero audit warnings across all 20 inspected Vue SFCs

- [ ] **Step 1: Verify baseline audit failure**

Run: `node scripts/ux-audit.js`
Expected: FAIL (`Errors: 1`, `Warnings: 21`, exit code `1`).

- [ ] **Step 2: Confirm target-size rule pattern in `scripts/ux-audit.js`**

Verify lines 139–142 of `scripts/ux-audit.js` require either `::before`/`::after` hit-pad (`width`/`min-width`/`height`/`min-height >= 44px` or negative `top`/`bottom`/`inset`) or `min-height`/`min-width >= 40px` on the class selector.

- [ ] **Step 3: Apply accessible labels, decorative SVG `aria-hidden`, and `::before` `>= 44px` hit boxes**

1. `AdminCarouselTab.vue`: add `alt="معاينة قص البنر الإعلاني"` (`cropperImageElement`, line 130) and `aria-label="اختيار ملف صورة البنر الإعلاني"` (`carouselFileInput`, line 69).
2. `AdminEmployeesTab.vue`: add `aria-hidden="true"` to the 11 decorative `<svg>` elements; add `:aria-label="'ربط الشيف ' + (ch.chefName || '')"` to the 2 chef checkboxes (lines 923 & 938); add `position: relative` + `::before` `>= 44px` hit boxes for `.emp-month-arrow` and `.emp-filter-pill`.
3. Add `::before` `>= 44px` hit boxes (`position: relative; content: '';`) to `.modal-close-btn` (`AdminShortcutsModal.vue`), `.inv-stepper-btn` (`InventoryTab.vue`), `.dp-footer-btn` (`RtlDatePicker.vue`), and `.btn-confirm-received-subtle` / `.btn-edit-order-subtle` (`AccountView.vue`) without inflating compact visual buttons.

- [ ] **Step 4: Run UX audit to verify pass**

Run: `node scripts/ux-audit.js`
Expected: PASS (`Files Inspected: 20`, `Perfect Passes: 20`, `Warnings: 0`, `Errors: 0`, exit code `0`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdminCarouselTab.vue frontend/src/components/AdminEmployeesTab.vue frontend/src/components/AdminShortcutsModal.vue frontend/src/components/InventoryTab.vue frontend/src/components/RtlDatePicker.vue frontend/src/views/AccountView.vue
git commit -m "fix(a11y): resolve all WCAG 2.1 errors and touch-target warnings in ux-audit"
```

---

### Task 8: Frontend `apiClient.js`, Empty-Catch Cleanup & Service Worker Cache Bump

**Files:**
- Create: `frontend/src/utils/apiClient.js`
- Modify: `frontend/src/components/InventoryTab.vue:1473`
- Modify: `frontend/src/router/index.js:33,63,106,159`
- Modify: `frontend/src/stores/shop.js:17,37`
- Modify: `frontend/src/views/AdminView.vue:7485,7495,7797,7799,9685,10122`
- Modify: `frontend/src/views/ShopView.vue:489,501`
- Modify: `public/sw.js:1`

**Interfaces:**
- Consumes: Backend JSON `{ error, message, code, requestId, retryable }` (Task 2)
- Produces:
  - `fetchWithTimeout(url, options = {}, timeoutMs = 15000) => Promise<Response>`
  - `parseApiError(res, fallbackMessage) => Promise<string>`
  - `normalizeFetchError(err, fallbackMessage) => string`
  - `CACHE_NAME = 'emenu-cache-v236'`

- [ ] **Step 1: Verify baseline empty catches and SW cache version**

Run (PowerShell):
`(Select-String -Path (Get-ChildItem -Recurse frontend\src -Include *.vue,*.js) -Pattern 'catch\s*(\([^)]*\))?\s*\{\s*\}').Count; Select-String -Path public\sw.js -Pattern 'CACHE_NAME'`
Expected: `15` empty catches (plus optional comment-only catch), `emenu-cache-v235`.

- [ ] **Step 2: Confirm exact `apiClient.js` exports**

Ensure `fetchWithTimeout`, `parseApiError`, and `normalizeFetchError` use browser `AbortController` + `clearTimeout` in `finally` and map `AbortError`, network failures, and `401`/`403`/`429`/`5xx` to clear Arabic strings.

- [ ] **Step 3: Implement `apiClient.js`, replace all 15 empty catches, and bump `public/sw.js`**

1. Create `frontend/src/utils/apiClient.js` with `fetchWithTimeout`, `parseApiError`, and `normalizeFetchError`.
2. Replace every empty `catch` across `InventoryTab.vue`, `router/index.js`, `stores/shop.js`, `AdminView.vue`, and `ShopView.vue` with explicit `console.warn('[context] ...', err)` (ignoring only redundant router duplicate navigation noise cleanly if needed).
3. Update `public/sw.js` line 1 to `const CACHE_NAME = 'emenu-cache-v236';`.

- [ ] **Step 4: Verify zero empty catches remain and syntax is valid**

Run (PowerShell):
`(Select-String -Path (Get-ChildItem -Recurse frontend\src -Include *.vue,*.js) -Pattern 'catch\s*(\([^)]*\))?\s*\{\s*\}').Count; node --check frontend\src\utils\apiClient.js; node --check public\sw.js`
Expected: Count `0`, syntax checks exit `0`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/apiClient.js frontend/src/components/InventoryTab.vue frontend/src/router/index.js frontend/src/stores/shop.js frontend/src/views/AdminView.vue frontend/src/views/ShopView.vue public/sw.js
git commit -m "feat(frontend): add apiClient timeout/error helpers, log caught errors, bump sw v236"
```

---

### Task 9: Workspace Skill Governance & Engineering Docs/ADRs

**Files:**
- Delete: `SKILL.md`
- Replace: `.agents/skills/taste-skill/` -> `.agents/skills/generating-mobile-mockups/`
- Modify: `.agents/skills/apple-design/SKILL.md`
- Create: `.agents/skills/applying-emenu-brand/SKILL.md` (+ `resources/`), `.agents/skills/releasing-emenu/SKILL.md`, `.agents/skills/auditing-emenu-db/SKILL.md`
- Create: `docs/README.md`, `docs/adr/0001-multi-tenant-db-and-pocketbase.md`, `docs/adr/0002-backend-modularization.md`, `docs/adr/0003-vue-dtcg-design-system.md`, `docs/specs/2026-11-20-emenu-hardening-and-hygiene-design.md`, `docs/plans/2026-11-20-phase-0-and-4-plan.md`

**Interfaces:**
- Consumes: `design-system/e-menu/MASTER.md` & `frontend/src/tokens/tokens.json` (Task 6)
- Produces: Lean `<500`-line skills under `.agents/skills/` and complete architecture/planning docs under `docs/`

- [ ] **Step 1: Verify baseline skill bloat and root duplicate**

Run (PowerShell):
`Test-Path SKILL.md; (Get-Content .agents\skills\taste-skill\SKILL.md).Count`
Expected: `True` and `1466`.

- [ ] **Step 2: Validate skill structure requirements**

Confirm every `SKILL.md` under `.agents/skills/` uses valid YAML frontmatter (`name` matching folder, third-person `description` with `"Use when..."`), forward slashes only, and `<500` lines (`<300` for new/refactored skills).

- [ ] **Step 3: Execute skill refactoring and docs creation**

1. Remove root `SKILL.md` and `.agents/skills/taste-skill/`.
2. Create `.agents/skills/generating-mobile-mockups/` (`SKILL.md` `<300` lines + `references/layout-and-flow.md`, `references/visual-direction.md`, `references/typography-and-quality.md`).
3. Polish `.agents/skills/apple-design/SKILL.md` (`<320` lines, Vue integration checklist referencing `sheetGesture.js`, `viewTransition.js`, `prefers-reduced-motion`).
4. Author `.agents/skills/applying-emenu-brand/`, `.agents/skills/releasing-emenu/`, and `.agents/skills/auditing-emenu-db/`.
5. Author `docs/README.md`, ADRs `0001`–`0003`, Design Spec, and this Implementation Plan.

- [ ] **Step 4: Run skill & doc verification**

Run (PowerShell):
`Test-Path SKILL.md; Get-ChildItem -Recurse .agents\skills -Filter SKILL.md | ForEach-Object { "$($_.Directory.Name): $((Get-Content $_).Count) lines" }`
Expected: `False` for root `SKILL.md`; every skill `<500` lines; zero backslashes in skill paths; all `docs/` files present.

- [ ] **Step 5: Commit**

```bash
git add -A .agents/skills docs SKILL.md
git commit -m "docs(governance): curate workspace skills, ADRs, spec, and Phase 0+4 plan"
```

---

### Task 10: Post-Merge Full Integration & Non-3000 Smoke Verification

**Files:**
- Verify integrated workspace (`c:\wamp64\www\e-Menu` on `main` or integration branch)

**Interfaces:**
- Consumes: Merged commits from Tasks 1–9
- Produces: Verified production bundle (`public/app/`) and live HTTP smoke confirmation without touching port `3000`

- [ ] **Step 1: Verify backend syntax and standalone unit suite**

Run (PowerShell):
`node --check server.js; if ($LASTEXITCODE -eq 0) { npm test }`
Expected: Exit `0`, all tests in `tests/backend-hardening.test.js` pass (`0` failed, `0` skipped).

- [ ] **Step 2: Verify token compilation and WCAG/UX audit**

Run (PowerShell):
`npm run tokens:build; if ($LASTEXITCODE -eq 0) { npm run ux:audit }`
Expected: `tokens.css` contains zero self-referential `--touch-target-*`; `ux:audit` reports **20 files inspected, 0 Errors, 0 Warnings**, exit `0`.

- [ ] **Step 3: Build production Vue bundle**

Run: `npm run build`
Expected: Vite compiles cleanly into `public/app/` with `public/sw.js` at `emenu-cache-v236`.

- [ ] **Step 4: Run read-only live HTTP smoke test on port `3006`**

Launch `PORT=3006 node server.js` in a background process inside `try { ... } finally { Stop-Process -Id $proc.Id -Force }`:
1. `GET http://localhost:3006/api/health` -> `200` JSON + `X-Request-Id` header present.
2. `GET http://localhost:3006/api/ready` -> structured JSON (`200` or `503`) + `X-Request-Id`.
3. `GET http://localhost:3006/api/admin/employees` (unauthenticated) -> `401` JSON containing `{ error, code, message, requestId }` and zero stack trace.
4. Confirm port `3006` listener is closed cleanly in `finally` and port `3000` is untouched.

- [ ] **Step 5: Tag release readiness / push only when authorized**

Confirm clean `git status` and push to remote only on explicit release step per `.agents/skills/releasing-emenu/SKILL.md`.

---

## Roadmap Summary: Phases 1–3 (Follow-Up Architecture)

After Phase 0 and Phase 4 land cleanly on `main`, subsequent work decomposes the monoliths incrementally per [ADR 0002](../adr/0002-backend-modularization.md) and [ADR 0003](../adr/0003-vue-dtcg-design-system.md):

| Phase | Target Scope | Prerequisites / Gate | Expected Outcome |
|---|---|---|---|
| **Phase 1 — Backend Auth/Middleware + First Vertical Slices** | Extract `src/middleware/` (`attachStaffSession`, `checkStaffShop`, `requireAdminShop`, `requireGlobalAdmin`, `checkCustomerAuth`, `createRateLimiter`), `src/infra/mongo.js`, `src/infra/s3.js`, and slices `auth`, `catalog`, `marketing`. | Characterization & RBAC contract tests covering `shop1`/`shop2` isolation and cookie/Bearer sessions pass first. | Cuts ~2,500 lines from `server.js`; enforces typed boundaries for staff/customer auth and catalog uploads. |
| **Phase 2 — Orders, Payments & PocketBase Inventory Extraction** | Extract `src/domains/orders/`, `src/domains/customers-payments/`, and `src/domains/inventory/` with explicit repository injection and atomic counter/ledger wrappers. | Order cooldown, customer phone merge, payment distribution, and `stock_reservations` reversal characterization tests pass against test fixtures. | Isolates highest-risk financial & inventory consistency logic behind unit-testable services. |
| **Phase 3 — HR/Production Split, `AdminView.vue` Decomposition & Hex Token Migration** | Extract `employees-production` & `backups-telemetry` slices shrinking `server.js` to `<300` lines; decompose `AdminView.vue` (31,463 lines) into domain tabs; migrate the **3,157 non-token raw hex occurrences** (Waves 2–4) to semantic tokens in `tokens.json`. | Phase 1–2 tests green; Wave 2 storefront tokens validated with `npm run ux:audit` and visual regression checks. | Eliminates dual monoliths (`server.js` + `AdminView.vue`) and brings frontend styling under strict DTCG governance. |

---

## Self-Review Check Results

1. **Spec Coverage:** Every goal, error/resilience contract, auth/upload boundary, WCAG/token fix, skill refactor, and doc artifact in the spec maps directly to Tasks 1–10.
2. **Step Scan:** Every step gives exact file paths, symbol signatures, concrete test assertions, and exact CLI commands with zero vague placeholders or full-file transcripts.
3. **Type & Signature Consistency:** `loadConfig`, `validateRuntimeConfig`, `AppError` subclasses, `requestIdMiddleware`, `sendSafeError`, `errorHandlerMiddleware`, `fetchWithTimeout`, `retryTransient`, `CircuitBreaker`, `hashPasswordAsync`, `verifyPasswordAsync`, `needsPasswordRehash`, `generateCustomerToken`, `verifyCustomerToken`, `validateImageUpload`, and `apiClient.js` exports match identically across `Interfaces`, test assertions, and task consumers.
4. **Review Focus Audit:** All 5 highest-risk failure modes (`ADMIN_SESSION_SECRET` Render safety, async `scrypt` `await` + legacy compat, deterministic 4xx retry & `.error` compat, `.svg`/MIME upload bypass, cyclic CSS token & hit-box audit) map explicitly to pinning tests in Tasks 1–7.
5. **Proportion Check:** Plan stays focused, scannable, and proportional to the multi-track Phase 0 + Phase 4 scope.
