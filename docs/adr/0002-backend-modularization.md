# ADR 0002: Incremental Vertical-Slice Backend Modularization

- **Status:** Proposed
- **Date:** 2026-11-20

## Context

The backend currently lives in a single file, [`server.js`](../../server.js), observed at **8,382 lines** and **137 Express route registrations** (**124 `/api/*` API endpoints** plus SPA shell and static PWA asset routes), interleaving environment loading, cryptographic helpers, S3 uploads, MongoDB initialization, PocketBase sync, customer accounting, employee payroll, analytics aggregations, backups, and background intervals.

At the same time:
- Production runs continuously on Render (`render.yaml`, `node server.js`, `e-menu-secrets`) with live storefront and POS traffic.
- The codebase currently lacks an automated regression suite covering route contracts, RBAC shop-scoping, and cross-collection accounting invariants.
- A big-bang rewrite of `server.js` risks subtle regressions in Arabic text normalization, Libyan phone variants (`getLibyanPhoneVariants`), customer debt allocation (`payments`), or Shop 2 stock reservations.

## Decision

Adopt an **incremental vertical-slice (Strangler Fig) modularization** of `server.js`, strictly **guarded by regression and contract tests before each domain extraction**:

1. **Phase 0 — Foundational Cross-Cutting Modules (Non-Route Infrastructure First):**
   Extract pure, dependency-light infrastructure modules out of `server.js` while keeping all 124 `/api/*` URLs, HTTP status semantics, and `.error` JSON fields 100% backwards-compatible:
   - `src/config/env.js`: Centralized environment config loader (`loadConfig`, `validateRuntimeConfig`) with Render-safe security warnings.
   - `src/errors/AppError.js`: Typed errors (`AppError`, `ValidationError`, `AuthError`, `NotFoundError`, `UpstreamError`), `requestIdMiddleware`, `sendSafeError`, and `errorHandlerMiddleware`.
   - `src/infra/resilience.js`: `fetchWithTimeout`, `retryTransient`, and `CircuitBreaker`.
   - `src/security/authHelpers.js`: Async `scrypt` + legacy PBKDF2/plaintext password verification, signed customer token TTL checks, and safe raster-image upload validation—kept pure so `node --test tests/*.test.js` runs in worktrees without requiring `node_modules` or live databases.

2. **Phases 1–3 — Test-Guarded Vertical-Slice Domain Extraction:**
   - **Shared Middleware & Infra (`src/middleware/`, `src/infra/`):** Extract `attachStaffSession`, `checkStaffShop`, `requireAdminShop`, `requireGlobalAdmin`, `checkCustomerAuth`, `createRateLimiter`, MongoDB connection/index lifecycle (`src/infra/mongo.js`), and S3 upload/delete adapters (`src/infra/s3.js`).
   - **Vertical Domain Slices (`src/domains/<domain>/`):** Each domain encapsulates its Express `Router`, service/use-case rules, and MongoDB/PocketBase repository adapters (inward dependencies, no direct `db.collection(...)` calls inside route handlers):
     - `src/domains/auth/` (staff login, customer register/login/password, bulk code, public staff directory)
     - `src/domains/catalog/` (Shop 1 & Shop 2 products, categories, tags, availability)
     - `src/domains/marketing/` (carousel CRUD & shop scoping)
     - `src/domains/orders/` (Shop 1 & Shop 2 order creation, duplicate cooldown, status transitions, edits, cleanup)
     - `src/domains/inventory/` (PocketBase sync, auto-match, reservations, reconciliation)
     - `src/domains/customers-payments/` (phone merging, customer balances, payment distribution, exports)
     - `src/domains/employees-production/` (employees, jobs, transactions, payouts, chefs, production reports)
     - `src/domains/backups-telemetry/` (full DB backups, telemetry batch/insights, admin analytics, order reset)
   - **Characterization Gate:** No domain block may be extracted from `server.js` until characterization/contract tests verify its request/response payloads, shop-scope RBAC (`shop1` vs `shop2`), and edge cases. `server.js` eventually becomes a thin composition root (<300 lines) wiring config, middleware, domain routers, health/readiness probes, and graceful shutdown.

## Alternatives Considered

- **Big-bang rewrite into separate microservices or a brand-new Express skeleton:** Rejected because splitting Shop 1, Shop 2, customers, and payroll across services introduces operational overhead on Render free/single-service hosting and high regression risk without pre-existing tests.
- **Technical-layer grouping (`controllers/`, `models/`, `services/` at root):** Rejected because 8,000+ lines grouped purely by layer scatters related feature logic (e.g., Shop 2 orders + stock reservations) across distant folders rather than isolating cohesive domain boundaries.
- **Leaving `server.js` as a monolith permanently:** Rejected because 8,382 lines in one scope causes hidden global state coupling, untestable helpers, inconsistent error handling, and high cognitive load for both engineers and AI agents.

## Consequences

- **Positive:**
  - Every extraction phase ships safely to production on Render with zero URL/API breaks.
  - Pure `src/config`, `src/errors`, `src/infra`, and `src/security` modules become immediately unit-testable via Node's native test runner (`node --test`).
  - Eliminates global mutable DB globals (`db`, `ordersCollection`, etc.) over time via explicit dependency injection into domain factories.
- **Tradeoffs / Risks:**
  - During Phases 1–2, `server.js` and `src/domains/*` coexist transiently, requiring discipline so shared helpers (`findCustomerByPhone`, `invalidateAnalyticsCache`) are not duplicated.
  - Adding characterization tests against MongoDB requires either clean repository mocks/in-memory stubs or an isolated test database so live `emenu`/`emenu2` collections are never mutated.
