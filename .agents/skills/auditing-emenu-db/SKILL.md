---
name: auditing-emenu-db
description: Inspects live e-Menu MongoDB databases (emenu, emenu2), PocketBase inventory, and EmenuBackup snapshots strictly read-only without printing secrets. Use when auditing collection counts, schemas, indexes, Shop 2 stock reservations, PocketBase links, or backup integrity.
---

# Auditing e-Menu Databases (Read-Only)

Strict read-only inspection and backup verification protocol for live e-Menu MongoDB (`emenu`, `emenu2`), PocketBase (`crystal-crocodile.pikapod.net`), and `EmenuBackup` snapshots.

## Non-Negotiable Safety Invariants

1. **Strict Read-Only Access:** Never run `insert*`, `update*`, `delete*`, `replaceOne`, `findOneAnd*`, `drop*`, `createIndex`, or HTTP `POST`, `PATCH`, `PUT`, `DELETE` against live MongoDB or PocketBase during audits or tests. Never execute mutating scripts (`scripts/init_storage_flags.cjs`, `scripts/sync_shop2_to_pocketbase.cjs`, `scripts/batch_link_and_reserve.cjs`) during an inspection.
2. **Zero Secret Exposure:** Never read `.env` with file-view tools or print/log `MONGO_URI`, `AWS_SECRET_ACCESS_KEY`, `ADMIN_PASS`, `ADMIN_SESSION_SECRET`, or credentials. Load `.env` strictly in-process (`import 'dotenv/config'`) and log only boolean presence checks (`hasMongoUri: Boolean(process.env.MONGO_URI)`).
3. **Minimal Read Footprint:** Always apply `.project({ ... })` (excluding large blobs such as `backups.collections` and sensitive fields such as `passwordHash` or `password`) and `.limit(N)` on MongoDB queries, plus `?perPage=N` on PocketBase `GET` queries.
4. **Bounded Timeouts:** Always configure `MongoClient` with `serverSelectionTimeoutMS: 10000` and wrap PocketBase `fetch` calls with `AbortSignal.timeout(8000)`.

## When to use this skill
- Checking document counts, recent records, or index coverage across `emenu` and `emenu2`
- Auditing `emenu2.products` `inventoryLink.recordId` mappings against PocketBase `inventory`
- Inspecting active or expired `emenu2.stock_reservations` (`status: 'reserved'`)
- Verifying `EmenuBackup` JSON files and `emenu.backups` metadata integrity

## Database & Collection Topology

| Store | Purpose | Collections |
| --- | --- | --- |
| **MongoDB `emenu`** | Shop 1 + shared auth, workforce, payments & ops | `products`, `categories`, `tags`, `orders`, `customers`, `favorites`, `payments`, `counters`, `chefs`, `employees`, `employee_jobs`, `employee_transactions`, `marketing_carousel`, `admin_users`, `backups`, `telemetry` (30d TTL) |
| **MongoDB `emenu2`** | Shop 2 (Dry Pastries / النواشف) + reservations | `products`, `categories`, `tags`, `orders`, `chefs`, `stock_reservations` |
| **PocketBase (`POCKETBASE_URL`)** | External inventory (`https://crystal-crocodile.pikapod.net`) | `inventory` (`GET /api/collections/inventory/records?perPage=...`) |

## `EmenuBackup` Verification Rules

Matches `performFullDatabaseBackup` and `/api/admin/backups` in `server.js`:

- **Backup Directory:** `process.env.BACKUP_DIR` or `$HOME/Documents/EmenuBackup` (resolve via `path.join(os.homedir(), 'Documents', 'EmenuBackup')`, never hardcode machine-specific user paths).
- **Expected Scope (`20` Collections):** All `14` backed-up `emenu` collections (excluding `backups` and `telemetry`) plus all `6` `emenu2` collections (`products`, `categories`, `tags`, `orders`, `chefs`, `stock_reservations`).
- **Disk-First Storage:** When `savedToDisk === true`, MongoDB `emenu.backups` stores metadata + `stats` (`collections` is omitted to stay under BSON 16MB limits). Pre-reset `/api/admin/reset/orders` aborts automatically unless `savedToDisk` succeeds.
- **Integrity Checks (Read-Only):**
  1. Query `emenu.backups` with `projection: { collections: 0 }`, `sort: { createdAt: -1 }`, `.limit(10)`.
  2. Read local JSON backup files from `BACKUP_DIR`, verify `JSON.parse` succeeds, confirm `Object.keys(doc.collections)` contains all `20` collection keys, and compare `doc.collections[k].length` against `doc.stats[k]`.

## Read-Only Audit Templates

Run temporary checks via `node --input-type=module -e "..."` (never modify tracked scripts or live data):

```js
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db1 = client.db('emenu');
  const db2 = client.db('emenu2');
  const recentBackups = await db1.collection('backups')
    .find({}, { projection: { collections: 0 } })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
  const activeReservations = await db2.collection('stock_reservations')
    .find({ status: 'reserved' }, { projection: { orderId: 1, productId: 1, qty: 1, reservedAt: 1 } })
    .limit(20)
    .toArray();
  console.log({ backupCount: recentBackups.length, activeReservations: activeReservations.length });
} finally {
  await client.close();
}
```

```js
// Read-only PocketBase inventory head check
const baseUrl = process.env.POCKETBASE_URL || 'https://crystal-crocodile.pikapod.net';
const res = await fetch(`${baseUrl}/api/collections/inventory/records?perPage=1`, {
  signal: AbortSignal.timeout(8000)
});
if (!res.ok) throw new Error(`PocketBase GET failed: ${res.status}`);
const data = await res.json();
console.log({ totalItems: data.totalItems, sampleKeys: Object.keys(data.items?.[0] || {}) });
```

## Audit Checklist

Copy and track before reporting database findings:

- [ ] Zero write operations (`insert`, `update`, `delete`, `drop`, `POST`, `PATCH`, `PUT`, `DELETE`) executed
- [ ] Zero secrets read, echoed, or printed from `.env` or environment variables
- [ ] Every MongoDB query uses `.project({ ... })` (no `collections` or `passwordHash` dumps) and `.limit(N)`
- [ ] Every PocketBase request uses `GET`, `?perPage=N`, and `AbortSignal.timeout(8000)`
- [ ] `EmenuBackup` verification checks both `emenu.backups` metadata and local JSON `20`-collection `stats` parity
- [ ] Index verification covers TTL rules (`cancelledAt` `86400s` on `orders` / `emenu2.orders`, `timestamp` `30d` on `telemetry`)
