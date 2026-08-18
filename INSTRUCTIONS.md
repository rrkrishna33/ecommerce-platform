# Multi-Tenant E-Commerce Platform - Project Instructions

**Last Updated:** 2026-08-19  
**Status:** Foundation Complete (Phase 1 ✅)  
**Phase:** Multi-Tenant Infrastructure (Database, Schemas, Provisioning)

---

## 🎯 Project Overview

This is a **greenfield multi-tenant white-label e-commerce SaaS platform** designed to power ~100 independent storefronts from a single TypeScript codebase. Each tenant gets:
- Isolated PostgreSQL database (database-per-tenant architecture)
- Custom subdomain or domain routing
- Independent admin panel
- Shared core infrastructure

**Key Design Principle:** Tenant isolation at the database level (separate Postgres databases per tenant), not row-level (shared schema). This enables true data isolation, independent scaling, and simple tenant deletion (single `DROP DATABASE`).

---

## 📁 Architecture Overview

```
ecommerce-platform/           # Monorepo root
├── apps/                     # (Future) Runnable applications
│   ├── api/                  # Express.js API server (Phase 2)
│   ├── master-admin/         # React SPA for platform owner (Phase 1 completed types)
│   ├── store-admin/          # React SPA for tenant store admin (Phase 1 completed types)
│   └── storefront/           # React SPA for customers (Phase 1 completed types)
│
├── packages/                 # Shared libraries (monorepo packages)
│   ├── db-control-plane/     # ✅ Platform-level database (tenants, themes, owners)
│   ├── db-tenant/            # ✅ Per-tenant database schema + queries
│   ├── tenant-runtime/       # ✅ Multi-tenancy plumbing (pooling, resolution, provisioning)
│   ├── auth/                 # ✅ JWT + bcrypt helpers
│   ├── shared-types/         # ✅ TypeScript domain model (single source of truth)
│   ├── themes/               # (Future) Theme token registry
│   ├── ui/                   # (Future) React component library
│   └── config/               # (Future) Shared eslint/prettier/tsconfig
│
├── scripts/                  # ✅ Operational scripts
│   ├── migrate-all-tenants.ts    # Run migrations across all active tenants
│   ├── dev-seed.ts               # Bootstrap dev with demo tenants + sample data
│   └── deploy-setup.mjs          # Initial database setup
│
├── DEPLOYMENT.md             # Step-by-step deployment guide
├── INSTRUCTIONS.md           # This file - project reference
├── .env.example              # Environment template
├── .env                      # Local environment (git-ignored)
├── docker-compose.yml        # Single Postgres 16 container for local dev
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # pnpm monorepo declaration
└── tsconfig.json             # Root TypeScript config (strict mode)
```

---

## 🗂️ What's Built (Phase 1 - Foundation)

### 1. **Control-Plane Database** (`packages/db-control-plane`)
Platform-level data in a single shared database (`platform_control`):

**Tables:**
- `platform_owners` — Master admin accounts (email, password_hash, role)
- `themes` — Theme registry (key, display_name, configJson)
- `tenants` — Tenant directory (subdomain, custom_domain, db credentials, status, created_at)
- `tenant_provisioning_log` — Audit trail (step, status, error, timestamp per tenant)

**Queries:** Full CRUD for each table, 100% type-safe, parameterized SQL.

### 2. **Tenant Database Schema** (`packages/db-tenant`)
Per-tenant data template applied to each tenant's isolated database:

**12 Tables:**
- `categories`, `products`, `product_variants`, `inventory` — Product catalog
- `store_admins`, `customers`, `addresses` — Identity
- `carts`, `cart_items` — Shopping cart
- `orders`, `order_items` — Order history
- `payments` — Payment records

**45 Query Functions:**
- Full CRUD on every entity
- Filtering, pagination, status management
- Transaction-safe operations (ON CONFLICT, upserts)
- Parameterized queries (no SQL injection risk)

**Idempotent Migration:** `001_init.sql` uses `CREATE TABLE IF NOT EXISTS`, safe to re-run.

### 3. **Multi-Tenancy Runtime** (`packages/tenant-runtime`)
Infrastructure for isolating and serving tenants:

**TenantPoolManager** — Per-tenant connection pooling
- LRU-cached `pg.Pool` per tenant (max 50 concurrent pools)
- 5 connections per pool, auto-evicted on LRU

**TenantResolutionManager** — Hostname→tenant routing
- Custom domain lookup (exact match in `tenants.custom_domain`)
- Subdomain extraction (e.g., `demo1.platform.com` → `demo1`)
- Dev-only override via `X-Tenant-Id` header or `?tenant=` query param
- LRU-cached resolution (100 entries, 30s TTL)

**provisionTenant()** — Tenant provisioning flow (6 steps)
1. Validate slug (`/^[a-z0-9-]+$/`) — prevents SQL injection
2. `CREATE DATABASE "tenant_<slug>"`
3. `CREATE USER "user_<slug>"` with random password (`crypto.randomBytes(24).base64url()`)
4. `GRANT ALL PRIVILEGES` on database to user
5. Register in control-plane `tenants` table with UUID ID
6. **Run tenant migrations** (new: Step 5 now calls `applyTenantMigrations`)
7. Mark status='active'

**Security:** ✅ SQL injection prevention, ✅ cryptographic passwords, ✅ UUID IDs, ✅ awaited cleanup.

### 4. **Authentication** (`packages/auth`)
Stateless JWT + bcrypt:

**Functions:**
- `hashPassword(pwd)` — bcrypt with 10 salt rounds
- `signToken(payload, secret, options)` — JWT sign (default 15m)
- `verifyToken(token, secret)` — JWT verify + error handling
- `refreshToken(payload, secret, options)` — Long-lived refresh JWT (default 7d)
- `decodeToken(token)` — Unsafe decode (for debugging)

**JWT Payload:**
```typescript
{
  sub: string,              // user ID
  role: 'platform_owner' | 'store_admin' | 'shopper',
  tenantId: string | null,  // null for platform_owner
  iat: number,
  exp: number
}
```

### 5. **Shared Type System** (`packages/shared-types`)
Single source of truth for domain model (17 interfaces):

- `Tenant` — Multi-tenancy identity + credentials
- `JwtPayload` — Auth token shape
- `Category`, `Product`, `ProductVariant`, `Inventory` — Catalog
- `StoreAdmin`, `Customer`, `Address` — Identity
- `Cart`, `CartItem`, `Order`, `OrderItem` — Commerce
- `Theme` — White-label styling
- `ApiResponse<T>`, `Paginated<T>` — API envelope

All TypeScript, no runtime validation (Zod deferred to Phase 2).

---

## 🚀 Operational Scripts

### `pnpm db:seed`
**What it does:**
1. Connects to control-plane DB
2. Ensures platform owner exists (`owner@example.com` / `password123`)
3. Creates 3 starter themes (classic, modern, bold)
4. Provisions 2 demo tenants (`demo1`, `demo2`):
   - Creates tenant databases
   - Runs migrations on each
   - Seeds store admin, customer, categories, products, variants, inventory
   - Prints storefront URLs

**Output:**
```
✓ Platform owner created/verified
✓ Themes created
✓ Demo tenant 1 provisioned
  ✓ Store admin: admin@demo1.local
  ✓ Sample products seeded
✓ Demo tenant 2 provisioned
  ✓ Store admin: admin@demo2.local
  ✓ Sample products seeded
Storefront URLs:
  http://demo1.127-0-0-1.nip.io:5173
  http://demo2.127-0-0-1.nip.io:5173
```

**Idempotent:** Safe to re-run. Checks for existing data before creating.

### `pnpm db:migrate [--tenant=<slug>]`
**What it does:**
1. Reads all active tenants from control-plane
2. For each tenant: connects using stored credentials, runs `applyTenantMigrations`
3. Continues past failures (logs per-tenant result)
4. Prints summary (N succeeded / N failed)

**Options:**
- No args: migrate all active tenants
- `--tenant=demo1`: migrate only demo1 (useful for testing/recovery)

**Output:**
```
Fetching tenants...
Migrating 2 tenant(s)...
[demo1] ✓ Success
[demo2] ✓ Success
===== Migration Summary =====
Succeeded: 2
Failed: 0
Total: 2
```

**Idempotent:** Each SQL file uses `IF NOT EXISTS`, safe to re-run.

---

## 📚 Database Schemas

### Control-Plane DB (`platform_control`)
```sql
-- One per platform, shared by all tenants
platform_owners (id, email, password_hash, role, created_at)
themes (id, key, display_name, config_json, created_at)
tenants (id, name, subdomain, custom_domain, db_host, db_port, db_name, db_user, db_password, theme_id, status, created_at)
tenant_provisioning_log (id, tenant_id, step, status, error, timestamp)
```

### Tenant DB (one per tenant, e.g., `tenant_demo1`)
```sql
-- Applied identically to each tenant's database
categories (id, name, slug, parent_id, created_at)
products (id, category_id, name, slug, description, status, base_price, created_at)
product_variants (id, product_id, sku, attributes JSONB, price_override, image_url)
inventory (variant_id PK, quantity_on_hand, reserved_quantity)
store_admins (id, email, password_hash, name, role, created_at)
customers (id, email, password_hash, name, created_at)
addresses (id, customer_id, line1, line2, city, state, postal_code, country, created_at)
carts (id, customer_id, status, created_at)
cart_items (cart_id, variant_id PK, quantity, price_at_add)
orders (id, customer_id, status, total, shipping_address_id, billing_address_id, payment_reference, created_at)
order_items (order_id, variant_id PK, quantity, unit_price, product_name_snapshot)
payments (id, order_id, provider, amount, status, created_at)
```

---

## 🔐 Security Model

### Tenant Isolation
- **Database-level:** Each tenant's data lives in a separate Postgres database, not a shared schema
- **No tenant_id column on records** — the database itself is the isolation boundary
- **Credentials per tenant** — stored in control-plane, used by runtime to pool connections
- **Connection pooling** — one pool per tenant, max 50 pools, max 5 connections each

### Cross-Tenant Prevention
- **requireSameTenant() middleware** (Phase 2) — re-checks `JWT.tenantId === resolvedTenant.id` on every request
- **Tenant resolution** — 403 if subdomain doesn't resolve or tenant is suspended

### Secrets
- **JWT_SECRET** — environment variable, used for token signing
- **Tenant DB passwords** — cryptographically random, stored encrypted in control-plane (out of scope for Phase 1, use secrets manager in production)
- **No hardcoded credentials** — all from `.env`

### SQL Injection Prevention
- **Parameterized queries** — all queries use `$1, $2` parameter binding, never string interpolation
- **Slug validation** — provisioning validates slug against `/^[a-z0-9-]+$/` before interpolating into `CREATE DATABASE`/`CREATE USER` (identifiers cannot be parameterized in Postgres)

---

## 🔄 Workflow: Creating a New Tenant (End-to-End)

1. **Platform owner calls API** `/platform/tenants/create` with `{ slug, name, themeId }`
2. **API calls `provisionTenant()`**
   - Validates slug
   - Creates database & user
   - Registers in control-plane with status='provisioning'
   - Runs `applyTenantMigrations` (all 12 tables)
   - Marks status='active'
   - Returns tenantId
3. **API creates store admin** in tenant DB (e.g., `INSERT INTO store_admins ...`)
4. **Platform owner sets custom domain** (optional) via `/platform/tenants/{id}/domain`
5. **Tenant is live:**
   - Subdomain routing: `tenant-slug.platform.com` → resolves to tenant in control-plane → connects to `tenant_<slug>` database
   - Store admin logs in at `/admin/auth/login` → token includes tenantId
   - Every request to `/admin/*` checks `requireSameTenant()` — prevents cross-tenant access
   - Shoppers visit `storefront` → theme from control-plane, products from tenant DB

---

## 🛠️ Key Files & Patterns

### Query Module Pattern
Every table group has a query module following this pattern:

```typescript
// packages/db-tenant/src/queries/products.ts
import { Pool } from 'pg';
import type { Product } from '@ecommerce/shared-types';

export async function createProduct(pool: Pool, product: Omit<Product, 'createdAt'>): Promise<Product> {
  const result = await pool.query(
    `INSERT INTO products (...) VALUES ($1, $2, ...) RETURNING *`,
    [product.id, product.name, ...]
  );
  return mapToProduct(result.rows[0]);
}

// Private row mapper: snake_case → camelCase
function mapToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    ...
  };
}
```

**Apply to:** Every query module. Ensures:
- Type safety (imports `Product` from shared-types)
- Parameterized SQL (no injection)
- Consistent row mapping (single source of truth for DB↔TS conversion)
- Exported public API, private mappers

### Configuration Pattern
`.env` → environment variables → `process.env.*` in code

```typescript
// scripts/dev-seed.ts
const CONTROL_PLANE_DATABASE_URL = process.env.CONTROL_PLANE_DATABASE_URL;
const TENANT_DB_HOST = process.env.TENANT_DB_HOST || 'localhost';
```

Never hardcode values. Use `.env.example` as template for new devs.

### Idempotent Migration Pattern
```sql
-- All migration files use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  ...
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
```

Safe to re-run without errors. Idempotency is critical for the `migrate-all-tenants` script to handle failures gracefully.

---

## 📖 Phase Roadmap

**✅ Phase 1 - Foundation (COMPLETE)**
- Multi-tenancy plumbing (pooling, resolution, provisioning)
- Control-plane DB + queries
- Tenant schema + 8 query modules
- Migration runner
- Type system
- Security hardening

**🔄 Phase 2 - API Server (Next)**
- Express.js HTTP server
- `/platform/*` routes (platform owner login, tenant CRUD)
- `/admin/*` routes (store admin, product management)
- `/store/*` routes (storefront, cart, checkout)
- `requireSameTenant` middleware
- Error handling, logging

**🎨 Phase 3 - Storefronts (After)**
- React SPAs (master-admin, store-admin, storefront)
- Theme engine (CSS variables, theme switching)
- Stripe integration (Phase 4: checkout & payments)
- Admin dashboards (orders, customers, analytics)

**📦 Phase 4 - Operations (Polish)**
- Health checks, monitoring
- Tenant suspension/deletion
- Custom domain management
- Audit logging
- Performance tuning

---

## 🚦 How to Run

### Prerequisites
- Node.js v18+
- pnpm v8+
- PostgreSQL 14+ (local or Docker)

### Setup
```bash
# 1. Install
pnpm install

# 2. Start Postgres
docker-compose up -d
# OR use existing Postgres on localhost:5432

# 3. Deploy
pnpm db:setup  # creates control-plane DB and schema

# 4. Seed demo tenants
pnpm db:seed

# 5. Verify
pnpm db:migrate  # should show 2 tenants migrated successfully

# 6. Build (optional, for CI/CD)
pnpm -r run build
pnpm -r run type-check
```

### Next: Start API Server (Phase 2)
```bash
# (When Phase 2 is built)
pnpm -w api dev
```

Then visit storefronts:
- `http://demo1.127-0-0-1.nip.io:5173` (customer view)
- `http://demo1-admin.127-0-0-1.nip.io:5173` (store admin)
- `http://owner.127-0-0-1.nip.io:5173` (platform admin)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot connect to PostgreSQL` | Verify `docker-compose up -d` or local Postgres running on port 5432 |
| `database "platform_control" does not exist` | Run `pnpm db:setup` to create and initialize |
| `No matching version for jsonwebtoken@^9.1.0` | Fixed in Phase 1 — use `@^9.0.0` |
| `Migration fails: table already exists` | This is OK! Migrations use `IF NOT EXISTS` and are idempotent |
| `cannot connect to server... IPv6 address...` | Try `localhost` instead of `127.0.0.1`, or configure pg driver to use IPv4 |
| `module '@ecommerce/shared-types' not found` | Run `pnpm install` to link workspace packages |

---

## 📝 Common Tasks

**Add a new table to tenant schema:**
1. Add interface to `packages/shared-types/src/index.ts`
2. Add CREATE TABLE to `packages/db-tenant/migrations/001_init.sql` (idempotent)
3. Create `packages/db-tenant/src/queries/<table>.ts` query module
4. Export from `packages/db-tenant/src/index.ts`
5. Run `pnpm db:migrate` on existing tenants (or happens automatically on next provision)

**Add a new query function:**
1. Add to appropriate query module (e.g., `products.ts`)
2. Update row mapper if schema changes
3. Export from module and barrel index
4. Use in Phase 2 API routes

**Update tenant provisioning flow:**
1. Edit `packages/tenant-runtime/src/provisionTenant.ts`
2. Add step in the flow
3. Call `onProgress()` for status updates
4. Test with `pnpm db:seed` (creates demo1, demo2)

---

## 🎓 Learning Path for New Contributors

1. **Read** this file (INSTRUCTIONS.md) — understand project structure
2. **Read** DEPLOYMENT.md — understand operations
3. **Explore** `packages/shared-types/src/index.ts` — the domain model
4. **Study** `packages/db-control-plane/src/queries/tenants.ts` — query module pattern
5. **Study** `packages/tenant-runtime/src/provisionTenant.ts` — provisioning flow
6. **Run** `pnpm db:seed` locally — see it in action
7. **Explore** `packages/db-tenant/src/queries/*.ts` — see pattern applied 8 times
8. **Read** `scripts/migrate-all-tenants.ts` — understand operational script
9. **Start Phase 2:** Build `/packages/api` with Express.js

---

## 📞 Support

For questions about:
- **Architecture:** See ARCHITECTURE overview above + phase roadmap
- **Security:** See Security Model section
- **Deployment:** See DEPLOYMENT.md
- **TypeScript types:** Check `packages/shared-types/src/index.ts`
- **How things work:** Read the source code (all files are small, well-commented)

---

**Status:** ✅ Foundation complete. Ready for Phase 2 (API server).  
**Last verified:** 2026-08-19
