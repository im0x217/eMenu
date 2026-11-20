# ADR 0001: Multi-Tenant MongoDB Databases and PocketBase Inventory Sync

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

**e-Menu (حلويات عبمبر الزروق)** operates two distinct storefronts and point-of-sale workflows behind a single Express/Node.js backend (`server.js`) and unified Vue 3 SPA (`frontend/`):

1. **Shop 1 (`shop1`, Gold theme):** Luxury pastries and fresh sweets (`الشرقي`, `الغربي`, `عبمبر`, `تورتات`, `عصائر`, `لوزيات`), made largely to order.
2. **Shop 2 (`shop2`, Navy theme):** Dry pastries & Nawashef (`قسم النواشف`), which share customers, customer debt/payments, and staff/HR management with Shop 1 while maintaining an independent product catalog, category tree, order stream, chef assignments, and physical warehouse inventory.

Additionally, Shop 2 warehouse quantities are managed in an external **PocketBase** instance (`POCKETBASE_URL`, defaulting to `https://crystal-crocodile.pikapod.net`) rather than directly inside MongoDB, requiring bidirectional synchronization between Shop 2 orders/catalog updates and PocketBase `/api/collections/inventory/records`.

## Decision

1. **Dual MongoDB Databases Over One Shared `MongoClient`:**
   `server.js` connects once via `MongoClient.connect(...)` and binds two logical MongoDB databases on the same cluster:
   - **`emenu` (Shop 1 + Shared Platform Domain):**
     - *Shop 1 catalog & orders:* `products`, `categories`, `tags`, `orders`, `chefs`
     - *Shared across both shops:* `customers`, `favorites`, `payments`, `counters` (`orderNumber` and `empTxNumber`), `admin_users` (RBAC with `shopAccess: 'shop1' | 'shop2' | 'all'`), `employees`, `employee_jobs`, `employee_transactions`, `marketing_carousel` (scoped by `shop`), `backups`, and `telemetry`.
   - **`emenu2` (Shop 2 Isolated Storefront & Warehouse Domain):**
     - `products`, `categories`, `tags`, `orders`, `chefs`, and `stock_reservations`.

2. **Shop Scope Enforcement at API & Auth Boundaries:**
   Staff tokens carry `shopAccess` (`shop1`, `shop2`, or `all`). Route middleware (`checkStaffShop`, `requireAdminShop`, `requireGlobalAdmin`, `enforceParsedBodyShopScope`) pins queries/mutations to the caller's authorized shop and rejects cross-shop access with HTTP `403` (`SHOP_FORBIDDEN` / `ROLE_FORBIDDEN`).

3. **PocketBase Inventory Sync & Compensating `emenu2.stock_reservations` Ledger:**
   - Shop 2 catalog mutations (`hasStorage` flag) cascade to PocketBase via `cascadeProductToPocketBase`, storing `inventoryLink: { recordId, legacyId, itemName, conversionFactor }` on `emenu2.products`.
   - Order lifecycle hooks (`reserveInventoryForOrder`, `confirmInventoryDeduction`, `returnInventoryForOrder`, `handleOrderEditInventory`) run **non-blocking** around `emenu2.orders` writes:
     - Physical stock is clamped (`actualDeducted = Math.min(prevStock, reserveQty)`) so PocketBase quantities never go negative.
     - `emenu2.stock_reservations` records the exact `actuallyDeducted` quantity (`status: 'reserved' | 'deducted' | 'returned'`) so cancellations/edits never invent phantom stock.
     - `reconcileInventoryStock()` runs every 6 hours to reconcile stale `reserved` records older than 24 hours against `emenu2.orders`.
   - **Resilience & Safety Requirements:** Because PocketBase is a remote HTTP dependency, `pbFetch` must execute behind bounded timeouts (`fetchWithTimeout` 8s default), transient retry (`retryTransient` for idempotent/5xx/429/network errors only—never deterministic 4xx), and a `CircuitBreaker` (`closed`/`open`/`half-open`) so a PocketBase outage cannot hang checkout or leak upstream stack traces/error bodies to clients.
   - **Backup & Audit Discipline:** `performFullDatabaseBackup` snapshots both `emenu` (14 business collections) and `emenu2` (all 6 collections) together. Automated tests and diagnostics must never mutate live `emenu`, `emenu2`, or PocketBase records.

## Alternatives Considered

- **Single database with `shop` discriminator field on every collection:** Rejected because Shop 1 and Shop 2 already hold independent schemas, `categories`/`tags` unique name indexes, and separate production datasets; merging would require risky live data migration and complicate per-shop indexing.
- **Replacing PocketBase with MongoDB-only inventory:** Rejected because PocketBase already serves external warehouse tooling (`crystal-crocodile.pikapod.net`) and changing warehouse systems is outside current operational scope.
- **Distributed two-phase commits across MongoDB + PocketBase REST:** Rejected because PocketBase does not participate in MongoDB transactions and blocking checkout on remote inventory HTTP locks would cause unacceptable POS checkout latency/failures.

## Consequences

- **Positive:**
  - Clean separation of Shop 1 and Shop 2 catalogs, orders, and chefs while preserving unified customer accounts, Libyan phone normalization (`09x-xxxxxxx`), combined customer balances/payments, and unified employee payroll.
  - Non-blocking reservation + `actuallyDeducted` tracking + 6-hour reconciliation keeps POS checkout fast even if PocketBase experiences transient flakiness.
- **Tradeoffs / Risks:**
  - Cross-database operations (`emenu.customers`/`emenu.payments` alongside `emenu2.orders`) and PocketBase HTTP mutations are **eventually consistent**, not ACID-atomic.
  - `server.js` must enforce strict `MongoClient` timeouts, bounded PocketBase timeouts/retries/circuit-breaking, and structured warning logs (no empty `.catch(() => {})` on cross-collection cascades or index creation).
  - Full-database restores must handle both `emenu.*` and `emenu2.*` namespaces atomically or in coordinated maintenance windows.
