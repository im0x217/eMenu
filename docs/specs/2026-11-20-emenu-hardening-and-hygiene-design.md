# e-Menu Phase 0 Hardening & Phase 4 Hygiene Design Specification

- **Date:** 2026-11-20
- **Work Size:** Project (multi-track backend, frontend, design tokens, skills, and documentation)
- **Related ADRs:** [ADR 0001](../adr/0001-multi-tenant-db-and-pocketbase.md), [ADR 0002](../adr/0002-backend-modularization.md), [ADR 0003](../adr/0003-vue-dtcg-design-system.md)
- **Target Execution Phases:** Phase 0 (Security, Error & Resilience Hardening + WCAG/Token Fixes) and Phase 4 (Workspace Skill Governance & Engineering Documentation)

---

## 1. Intent & Why

e-Menu (`حلويات عبمبر الزروق`) serves live customer ordering and multi-branch POS/HR back-office workflows across Shop 1 (`emenu`) and Shop 2 (`emenu2` + external PocketBase warehouse sync). While core domain features are operational, an architecture and security/UX audit uncovered high-leverage operational risks that must be neutralized **before** any structural decomposition of the 8,382-line [`server.js`](../../server.js) or the 31,463-line [`AdminView.vue`](../../frontend/src/views/AdminView.vue):

1. **Silent Failures & Internal Error Leakage:** 11 swallowed `.catch(() => {})` calls in `server.js`, 15 empty `catch` blocks in `frontend/src/`, and 18 HTTP responses returning raw `err.message` or internal hints (`create-s3-bucket.js`).
2. **Unbounded External I/O & Lifecycle Gaps:** `pbFetch` lacks request timeouts, transient retry filtering, and circuit breaking; `MongoClient.connect` lacks explicit socket/selection timeouts and capped backoff; intervals are untracked on `SIGTERM`/`SIGINT`; `uncaughtException` logs and continues in a potentially corrupted state.
3. **Auth & Upload Boundary Weaknesses:** Customer tokens lack an explicit expiration TTL check; customer/staff passwords use synchronous PBKDF2 (`10,000` iterations) without migrating to `scrypt`; `multer` accepts arbitrary MIME/extensions (including `.svg`/`.html`) up to `100 MB` using raw `file.originalname`.
4. **Design Token & WCAG 2.1 Audit Drift:** `scripts/build-tokens.js` generates cyclic CSS custom properties (`--touch-target-min: var(--touch-target-min)`), `design-system/e-menu/MASTER.md` drifted from `tokens.json`, and `scripts/ux-audit.js` reports **1 Error and 21 Warnings**.
5. **Agent Skill & Docs Fragmentation:** Stray root `SKILL.md` duplicate, an oversized 1,466-line `taste-skill`, no project-specific brand/release/DB safety skills, and no ADR/spec/plan governance under `docs/`.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Harden configuration loading, error normalization, outbound resilience, auth cryptography/TTLs, file upload boundaries, and process lifecycle in `server.js` via focused `src/` modules without breaking any existing API client or Render deployment.
- Eliminate all cyclic token definitions, reconcile `MASTER.md` with `tokens.json`, achieve **0 Errors and 0 Warnings** on `npm run ux:audit`, remove all silent catches in both backend and frontend, and bump the PWA Service Worker cache (`emenu-cache-v235` -> `emenu-cache-v236`).
- Establish clean workspace skill hygiene under `.agents/skills/` (each `SKILL.md` `< 500` lines) and foundational documentation under `docs/`.
- Introduce standalone unit/contract tests (`npm test` -> `node --test tests/*.test.js`) runnable even inside isolated worktrees without `node_modules` or live database connections.

### Non-Goals
- Decomposing the 124 `/api/*` routes in `server.js` into `src/domains/*` routers (deferred to **Phases 1–3** per [ADR 0002](../adr/0002-backend-modularization.md)).
- Migrating all **3,157 raw hex occurrences** in `frontend/src/` to CSS custom properties (deferred to incremental Waves 2–4 per [ADR 0003](../adr/0003-vue-dtcg-design-system.md)).
- Changing MongoDB (`emenu`/`emenu2`) or PocketBase collection schemas, migrating to Redis rate limiting, or introducing React/Tailwind.
- Editing global skills outside the repository (`~/.gemini/config/skills/`).

### Anti-Goals (Failure Conditions Even If Code Compiles)
- **Render Deploy Breakage:** Crashing on boot when `ADMIN_SESSION_SECRET` is omitted from Render `e-menu-secrets` or `.env` (unless `STRICT_CONFIG=true` is explicitly enabled).
- **Customer Lockout:** Breaking logins for existing customers stored with `<salt>:<pbkdf2Hex>` hashes or legacy plaintext `password` fields.
- **API Contract Breakage:** Dropping the legacy `.error` JSON property that existing Vue views inspect, or breaking multipart product/carousel upload payloads.
- **Gaming the Audit:** Editing `scripts/ux-audit.js` to suppress warnings rather than fixing the underlying Vue templates and CSS hit boxes.
- **Live Data Mutation:** Writing test documents to live `emenu`, `emenu2`, or `crystal-crocodile.pikapod.net` during tests or verification.

---

## 3. Global Constraints

1. **Render & `.env` Backward Compatibility:** Local `.env` and Render (`render.yaml` `fromGroup: e-menu-secrets`) may omit `ADMIN_SESSION_SECRET`; startup must warn loudly (`[SECURITY CONFIG WARNING]`) unless `STRICT_CONFIG === 'true'`, throwing fatally on boot only when `MONGO_URI` is missing or `STRICT_CONFIG === 'true'` rejects weak secrets.
2. **Error JSON Shape Compatibility:** Every HTTP error JSON body must retain `.error` alongside `{ code, message, requestId, retryable }` so existing frontend callers continue reading `data.error`.
3. **Zero Internal Leakage:** Never serialize `err.stack`, internal filesystem/script hints (`create-s3-bucket.js`), or raw 5xx/DB/PocketBase `err.message` strings in HTTP responses; use clean Arabic customer/operator messages.
4. **Worktree-Safe Testing:** Pure modules (`src/config/env.js`, `src/errors/AppError.js`, `src/infra/resilience.js`, `src/security/authHelpers.js`) and `tests/backend-hardening.test.js` must rely strictly on Node.js built-in modules (`node:test`, `node:assert/strict`, `node:crypto`) with zero dependency on `express` or `mongodb` so tests pass inside clean git worktrees lacking `node_modules`.
5. **Arabic RTL & Visual Integrity:** All user-facing error messages and `alt`/`aria-label` attributes use natural Arabic matching `tokens.json` and `MASTER.md`; touch-target fixes on compact toolbar/stepper buttons must expand hit geometry (`>= 44px` via `::before`/`::after` or explicit `min-height`/`min-width`) without distorting compact layouts.
6. **Non-3000 Verification Port & No Live Mutations:** Live HTTP smoke tests must run on a dedicated ephemeral port (e.g., `3006`), never touch port `3000`, never read/print `.env` secrets, and never mutate production DB collections.

---

## 4. Approaches Considered & Key Design Decisions

| Area | Selected Approach | Rejected Alternative | Rationale |
|---|---|---|---|
| **Backend Extraction** | Extract pure infrastructure modules (`src/config`, `src/errors`, `src/infra`, `src/security`) now; keep routes in `server.js` until regression tests guard Phases 1–3 | Big-bang split of all 137 routes in Phase 0 | Avoids regressions in coupled checkout, payment allocation, and stock-reservation flows while making critical security/resilience paths immediately unit-testable. |
| **Password Upgrade** | Async `scrypt:<saltHex>:<derivedHex>` (`crypto.scrypt`) with dual legacy verification (`pbkdf2` + `storedPlain`) and transparent lazy re-hash on login | Force password resets or synchronous `scryptSync` | `scrypt` improves brute-force memory-hardness without blocking Node's event loop and preserves 100% seamless login for existing users. |
| **Compact Touch Targets** | CSS `::before`/`::after` invisible hit-box expansion (`>= 44px`) for `.emp-month-arrow`, `.emp-filter-pill`, `.inv-stepper-btn`, `.modal-close-btn`, `.dp-footer-btn`, subtle Account buttons | Inflating visible button heights to 48px everywhere | Satisfies WCAG 2.5.5 / RICO target size and `scripts/ux-audit.js` rules without breaking dense POS/calendar/stepper layouts. |
| **Brand Skill Conflict** | Keep global `~/.gemini/` untouched; create project skill `.agents/skills/applying-emenu-brand/` + ADR 0003 | Overwrite global `applying-brand-identity` | Keeps global tools reusable for unrelated repos while giving e-Menu agents authoritative Vue 3 + DTCG + Arabic RTL rules. |

*Labeled Builder/Architect Calls:*
- **Call 1 (`src/` module format):** `package.json` uses CommonJS (`"main": "server.js"`, no `"type": "module"`). New backend modules under `src/` use CommonJS (`module.exports`) so `server.js` (`require(...)`) and `node --test` consume them natively without ESM interop shims. *(Scripts under `scripts/` remain ESM as already configured.)*
- **Call 2 (`trust proxy`):** Set `app.set('trust proxy', 1)` immediately after `const app = express()` so `req.ip` and rate-limiter client identification operate safely behind Render's single reverse-proxy hop.
- **Call 3 (`multer` S3 cleanup on invalid extension):** Because `fileFilter` executes inside `multer` **before** streaming to S3, invalid MIME types or extensions (`.svg`, `.html`, `.js`, `.exe`) are rejected prior to any AWS S3 upload.

---

## 5. Error & Resilience Contract

### 5.1 Centralized Environment Configuration (`src/config/env.js`)
- Centralize all **14 existing `process.env` variables** observed in `server.js`:
  `MONGO_URI`, `PORT` (`3000`), `ADMIN_USER` (`'admin'`), `ADMIN_PASS` (`'1234'`), `ADMIN_SESSION_SECRET` (fallback `'emenu-admin-secret-key-2026'`), `AWS_REGION` (`'us-east-1'`), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (`'e-menu-products'`), `AWS_CLOUDFRONT_DOMAIN`, `POCKETBASE_URL` (`'https://crystal-crocodile.pikapod.net'`), `BACKUP_DIR` (`~/Documents/EmenuBackup`), `BULK_CODE` (`'1234'`), `PUBLIC_STAFF_SELECTOR` (enabled unless `'false'`).
- Add **3 operational/hardening flags**:
  `CUSTOMER_TOKEN_TTL_DAYS` (default `30`, numeric floor `>= 1`), `STRICT_CONFIG` (default `'false'`), `ENABLE_DEBUG_ROUTES` (default `false` when `NODE_ENV === 'production'`, `true` otherwise).
- Export `loadConfig(env = process.env)` -> `{ config: Object.freeze(...), warnings: string[] }` and `validateRuntimeConfig(env = process.env)`:
  - `loadConfig` never throws solely on missing `ADMIN_SESSION_SECRET` unless `STRICT_CONFIG === 'true'`; instead pushes structured warnings for default/weak `ADMIN_SESSION_SECRET` or `ADMIN_PASS === '1234'`.
  - `validateRuntimeConfig` logs warnings via `[SECURITY CONFIG WARNING]`, throws `Error` if `MONGO_URI` is missing/empty at server boot, or if `STRICT_CONFIG === 'true'` and `ADMIN_SESSION_SECRET` is unset/default or `ADMIN_PASS === '1234'`.

### 5.2 Typed Errors & Safe Error Serialization (`src/errors/AppError.js`)
- Classes extending `Error`:
  - `AppError(message, { code = 'INTERNAL_ERROR', statusCode = 500, retryable = false, details = null, cause = null })`
  - `ValidationError` (`400`, `VALIDATION_ERROR`, `retryable: false`)
  - `AuthError` (`401` or `403`, `AUTH_ERROR`, `retryable: false`)
  - `NotFoundError` (`404`, `NOT_FOUND`, `retryable: false`)
  - `UpstreamError` (`502` or `503`, `UPSTREAM_ERROR`, `retryable: true`)
- Middleware & Helpers:
  - `requestIdMiddleware(req, res, next)`: preserves validated incoming `x-request-id` header or generates `crypto.randomUUID()`, assigns `req.id`, and sets response header `X-Request-Id`.
  - `sendSafeError(res, req, err, { fallbackMessage, statusCode, code })`:
    - Logs full structured context (`requestId`, `method`, `path`, `statusCode`, `code`, `message`, `stack`) **once** server-side.
    - Returns JSON `{ error: safeMessage, code, message: safeMessage, requestId: req?.id || null, retryable: Boolean(...) }`.
    - For `statusCode >= 500` or unknown non-`AppError` failures, `safeMessage` is always the Arabic `fallbackMessage` (never raw `err.message` or `err.stack`). Intentional `ValidationError` (`400`) domain messages pass through cleanly.
  - `errorHandlerMiddleware(err, req, res, next)` (4-arg Express error handler mounted last, after all routes): catches unhandled route exceptions and delegates to `sendSafeError` unless `res.headersSent`.
- Replace all **18 raw `err.message` HTTP responses** in `server.js` (debug endpoints, product upload handlers, `/api/telemetry/batch`, PocketBase `/api/admin/inventory/*` handlers, and order 400 handlers using `ValidationError`) with `sendSafeError`. Gate `/api/debug/*` routes behind `config.enableDebugRoutes`.

### 5.3 Outbound Resilience & Lifecycle (`src/infra/resilience.js` + `server.js`)
- `fetchWithTimeout(url, options = {}, timeoutMs = 8000)`: uses `AbortSignal.timeout(timeoutMs)` (combining caller `options.signal` via `AbortSignal.any` when available).
- `retryTransient(fn, { maxAttempts = 3, baseDelayMs = 250, isRetryable })`: exponential backoff with jitter; default `isRetryable` retries network/abort/timeout errors and HTTP `429` or `5xx`, **never** deterministic `4xx` (`400`, `401`, `403`, `404`, `422`).
- `CircuitBreaker({ failureThreshold = 5, cooldownMs = 30000 })`: states `'closed' | 'open' | 'half-open'`, `exec(fn)` fails fast with `UpstreamError` (`503`, `retryable: true`) while open, admits a single probe after `cooldownMs`, resets on success, and re-opens on probe failure.
- Wire `pbFetch` in `server.js` through `pbCircuitBreaker.exec(...)`, `retryTransient(...)` (for idempotent `GET` or safe transient network failures; non-idempotent mutations fail cleanly without double-deducting stock), and `fetchWithTimeout(..., 8000)`.
- Harden MongoDB & S3:
  - `MongoClient.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, socketTimeoutMS: 45000, maxPoolSize: 20 })`, store client reference for shutdown, and add capped exponential backoff + jitter (e.g., 2s -> 30s cap) to `connectWithRetry`.
  - `S3Client({ ..., maxAttempts: 3 })`.
- Eliminate all **11 `.catch(() => {})` silent swallows** in `server.js` (`findCustomerByPhone` phone-merge cascades at lines 271–274, customer update cascades around 4438–4441 & 4468, login/password cascades around 5275, `safeIndex` at line 8011) using `Promise.allSettled` + `[CASCADE WARN]` / `[DB INDEX WARN]` structured warnings.
- Health, Readiness & Graceful Shutdown:
  - Quiet `GET /api/health` (remove noisy per-request `console.log`).
  - Add `GET /api/ready` executing `db.admin().ping()` with a short timeout, returning `200` `{ status: 'ready', mongoConnected: true, requestId }` or `503` `{ status: 'not_ready', ... }`.
  - Track all `setInterval` handles (`createRateLimiter`, 30m cancelled-order cleanup, 6h inventory reconciliation) and `httpServer = app.listen(...)`. On `SIGTERM` / `SIGINT`, stop accepting connections (`httpServer.close`), clear intervals, close `mongoClient`, and enforce a 10s force-exit timer. On `uncaughtException`, log fatal context and initiate shutdown + `process.exit(1)`.

---

## 6. Security & Upload Boundaries

### 6.1 Customer & Staff Authentication (`src/security/authHelpers.js` + `server.js`)
- **Customer Token TTL:** `verifyCustomerToken(token, expectedPhone, { secret, ttlDays })` parses `timestamp = Number(parts[1])` and rejects any token where `!Number.isFinite(timestamp) || timestamp <= 0 || (now - timestamp) > ttlDays * 86400_000` (default `30` days via `CUSTOMER_TOKEN_TTL_DAYS`).
- **Async `scrypt` Password Hashing & Legacy Migration:**
  - `hashPasswordAsync(password)`: generates 16-byte random salt and derives 64-byte `crypto.scrypt` key (`scrypt:<saltHex>:<derivedHex>`).
  - `verifyPasswordAsync(password, storedHash, storedPlain, hmacSecret?)`: verifies `scrypt:` via `crypto.timingSafeEqual`, legacy `<salt>:<pbkdf2Hex>` (`10,000` iterations `sha512`), or legacy plaintext `storedPlain` via constant-time HMAC compare (optional `hmacSecret`).
  - All async route callers (`/api/customer/register`, `/api/customer/login`, `/api/customer/set-password`, `/api/admin/customers`, `/api/admin/customers/:id`, `/api/admin/customers/:id/reset-password`, `/api/admin/users`, and staff login/migration paths) `await` the async helpers and **transparently upgrade** legacy PBKDF2/plaintext hashes to `scrypt:` upon successful authentication (`needsPasswordRehash(storedHash)`).

### 6.2 Image Upload Boundary (`multer` & `uploadErrorHandler`)
- **Key Generation:** Replace `Date.now() + '-' + file.originalname` with `products/${crypto.randomUUID()}${ext}` using strictly validated lowercase extensions (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`).
- **Strict Raster `fileFilter`:** Export pure `validateImageUpload(mimetype, originalname)` in `src/security/authHelpers.js` allowing ONLY `image/jpeg`, `image/png`, `image/webp`, `image/gif` matched against safe extensions (`.jpg`/`.jpeg`, `.png`, `.webp`, `.gif`). Explicitly reject `.svg`, `.html`, `.htm`, `.js`, `.mjs`, `.exe`, `.php`, `.sh`, and extension/MIME mismatches via `req.fileValidationError` / `ValidationError`.
- **Payload Cap & Safe Error Messages:** Lower `limits.fileSize` from `100 MB` to **`15 * 1024 * 1024` (15 MB)**. Remove internal `create-s3-bucket.js` and raw `err.message` strings from `uploadErrorHandler`, returning clean Arabic `sendSafeError` JSON (`413`/`400`/`503`).

---

## 7. WCAG, Token Integrity & Frontend Resilience

1. **Acyclic Token Compiler (`scripts/build-tokens.js`):** Remove lines 108–109 (`--touch-target-min: var(--touch-target-min);` and `--touch-target-clearance: var(--touch-target-clearance);`) because `--touch-target-min: 48px;` and `--touch-target-clearance: 8px;` are already emitted in `:root` from `tokens.json`. Recompile `tokens.css` and `tokens.js`.
2. **Design System Reconciliation (`design-system/e-menu/MASTER.md`):** Align drifted hex literals to `tokens.json` (`#faf7f2` -> `#f7f3ec`, `#ffffff` card bg -> `#fffdf9`, `#6c757d` -> `#685f58`), update modal/input/checklist rules, and document `tokens.json` + `npm run tokens:build` as single source of truth.
3. **Resolve All 1 Error + 21 Warnings in `scripts/ux-audit.js`:**
   - `AdminCarouselTab.vue`: add `alt="معاينة قص البنر الإعلاني"` on `<img ref="cropperImageElement">` (line 130) and `aria-label="اختيار ملف صورة البنر الإعلاني"` on `<input type="file" ref="carouselFileInput">` (line 69).
   - `AdminEmployeesTab.vue`: add `aria-hidden="true"` to all 11 unlabeled decorative `<svg>` tags; add dynamic Arabic `:aria-label` on the 2 chef checkboxes (using `ch.chefName || ''`); expand `.emp-month-arrow` and `.emp-filter-pill` touch hit boxes (`>= 44px` via `::before` or `min-height`/`min-width`).
   - Expand `>= 44px` hit boxes cleanly for `.modal-close-btn` (`AdminShortcutsModal.vue`), `.inv-stepper-btn` (`InventoryTab.vue`), `.dp-footer-btn` (`RtlDatePicker.vue`), and `.btn-confirm-received-subtle` / `.btn-edit-order-subtle` (`AccountView.vue`).
4. **Frontend Fetch Resilience & Silent-Catch Cleanup:**
   - Create `frontend/src/utils/apiClient.js` exporting `fetchWithTimeout(url, options = {}, timeoutMs = 15000)`, `parseApiError(res, fallbackMessage)`, and `normalizeFetchError(err, fallbackMessage)` returning friendly Arabic messages (`انتهت مهلة الاتصال…`, `تعذر الاتصال بالخادم…`, 401/403/429/5xx) while reading `{ message, error }` safely.
   - Replace all **15 empty catches** across `InventoryTab.vue` (1), `router/index.js` (4), `stores/shop.js` (2), `AdminView.vue` (6, noting lines 7485, 7495, 7797/7799, 9685, 10122), and `ShopView.vue` (2) with structured `console.warn` logging (ignoring only benign `NavigationDuplicated` if applicable on router transitions).
5. **PWA Cache Invalidation:** Bump `CACHE_NAME` in `public/sw.js` line 1 from `'emenu-cache-v235'` to `'emenu-cache-v236'`.

---

## 8. Workspace Skill Governance & Documentation

- **Delete** stray root duplicate `SKILL.md` (identical to `.agents/skills/apple-design/SKILL.md`).
- **Refactor** `.agents/skills/taste-skill/` (`1,466` lines) into `.agents/skills/generating-mobile-mockups/` with `<300`-line `SKILL.md` (`name: generating-mobile-mockups`, third-person trigger description) and `references/` (`layout-and-flow.md`, `visual-direction.md`, `typography-and-quality.md`).
- **Audit & Polish** `.agents/skills/apple-design/SKILL.md` (`<320` lines, forward slashes only, append `e-Menu Vue Integration Checklist` referencing `sheetGesture.js`, `viewTransition.js`, `prefers-reduced-motion`).
- **Add 3 Project Skills** (`<300` lines each, gerund names matching directories, forward slashes only):
  1. `.agents/skills/applying-emenu-brand/` (+ `resources/brand-tokens-summary.md`, `resources/arabic-voice-tone.md`) — Vue 3 + DTCG + Cairo RTL + Shop 1/Shop 2 + health cert badges + Arabic copy rules.
  2. `.agents/skills/releasing-emenu/` — verified build/audit/test/SW-bump/non-3000-smoke/Render release flow.
  3. `.agents/skills/auditing-emenu-db/` — strict read-only MongoDB (`emenu`/`emenu2`) & PocketBase inspection protocol.
- **Docs & ADRs (`docs/`):** Maintain `docs/README.md`, ADRs `0001`–`0003`, this Design Spec, and the Phase 0 + 4 Implementation Plan.

---

## 9. Verification Strategy

Every change across Phase 0 and Phase 4 must pass these objective verification gates before merging to `main`:

| Gate | Command | Expected Result | Scope / Environment |
|---|---|---|---|
| **Backend Syntax** | `node --check server.js` | Exit `0`, zero syntax errors | Worktree & main workspace |
| **Pure Unit & Security Tests** | `npm test` (`node --test tests/*.test.js`) | All tests pass (`0` failed, `0` skipped) | Worktree & main workspace (no DB / `node_modules` needed) |
| **Token Compilation** | `npm run tokens:build` | Regenerates `tokens.css` & `tokens.js`; zero self-referential `--touch-target-*` lines | Worktree & main workspace |
| **WCAG / UX Audit** | `npm run ux:audit` | Exit `0`, **20 files inspected, 0 Errors, 0 Warnings** | Worktree & main workspace |
| **Empty-Catch & Secret Scan** | Pattern checks on `server.js` & `frontend/src/` | `0` `.catch(() => {})` in `server.js`, `0` raw `err.message` HTTP leaks, `0` empty catches in `frontend/src/`, `0` `SKILL.md` >= 500 lines | Worktree & main workspace |
| **Frontend Production Bundle** | `npm run build` | Vite builds `public/app/` cleanly with updated `sw.js` `v236` | Integrated main workspace (`frontend/node_modules` installed) |
| **Live Read-Only HTTP Smoke** | Boot `PORT=3006` in background (`try/finally` cleanup) | `GET /api/health` -> `200` + `X-Request-Id`; `GET /api/ready` -> structured JSON (`200`/`503`); `GET /api/admin/employees` (unauth) -> `401` `{ error, code, message, requestId }`; port `3006` terminated cleanly | Integrated main workspace (never touches port `3000` or mutates DB) |

---

## 10. Builder Check Summary (Self-Audit)

A fresh-eyes review of this specification identified four questions a builder would otherwise have to guess; all four are resolved here:

1. **Module system for new `src/` files:** Root `package.json` uses CommonJS (whereas `scripts/` uses ESM). *Resolution:* Use CommonJS (`module.exports` / `require`) across `src/` and `tests/backend-hardening.test.js` so `server.js` imports them directly without async `import()`.
2. **Legacy staff/admin vs customer password callers:** `hashCustomerPassword` is also used during startup admin seeding/migration (lines 8166, 8185) and user management (`/api/admin/users`). *Resolution:* Keep `hashCustomerPassword` / `verifyCustomerPassword` working cleanly or migrate all async route/seed callers to `await hashPasswordAsync` / `await verifyPasswordAsync`, while allowing `src/security/authHelpers.js` to verify `scrypt:`, `<salt>:<pbkdf2Hex>`, and `storedPlain` uniformly.
3. **Error payload shape for existing Vue callers:** Frontend components inspect `data.error` and `data.message`. *Resolution:* `sendSafeError` always populates both `error` and `message` with the sanitized Arabic string alongside `code`, `requestId`, and `retryable`.
4. **How `scripts/ux-audit.js` checks compact button hit boxes:** Line 139–142 of `scripts/ux-audit.js` specifically checks for `::before`/`::after` with `width`/`min-width`/`height`/`min-height >= 44px` (or negative `top`/`bottom`/`inset`), OR `min-height`/`min-width >= 40px` on the class rule. *Resolution:* Implement `position: relative` + `::before` pseudo-element hit box (`min-width: 44px; min-height: 44px;` centered with `inset` / `translate`) so both real pointer ergonomics and the audit regex are satisfied without inflating visual buttons.
