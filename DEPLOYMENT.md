# Deployment Guide - Multi-Tenant E-Commerce Platform

## Prerequisites

- **Node.js**: v18+ (tested with v24.18.0)
- **pnpm**: v8+ (package manager)
- **PostgreSQL**: v14+ (or Docker for containerized setup)
- **Docker & Docker Compose**: (optional, for containerized Postgres)

## Step 1: Clone & Install

```bash
# Navigate to project directory
cd C:\ecommerce-platform

# Install all workspace dependencies
pnpm install

# Verify installation
pnpm -r run type-check
```

## Step 2: Database Setup

### Option A: Docker (Recommended for Local Dev)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker ps | grep postgres

# Check connectivity
docker exec ecommerce-postgres psql -U postgres -c "SELECT version();"
```

### Option B: Local PostgreSQL

```bash
# Ensure PostgreSQL is running on localhost:5432
# Create control-plane database
psql -U postgres -c "CREATE DATABASE platform_control;"

# Verify
psql -U postgres -d platform_control -c "SELECT 1;"
```

## Step 3: Environment Configuration

Copy and verify `.env` file:

```bash
# Check configuration
cat .env

# Expected values:
# CONTROL_PLANE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/platform_control
# TENANT_DB_HOST=localhost
# TENANT_DB_PORT=5432
# NODE_ENV=development
```

## Step 4: Initialize Control-Plane Database

Create and run control-plane schema:

```bash
# Connect to control-plane database and apply schema
psql -U postgres -d platform_control -f packages/db-control-plane/migrations/001_init.sql

# Verify tables created
psql -U postgres -d platform_control -c "\dt"
# Expected output: platform_owners, themes, tenants, tenant_provisioning_log
```

## Step 5: Seed Development Data

```bash
# Create demo tenants with sample data
# This will:
# - Ensure platform owner exists (owner@example.com)
# - Create 3 starter themes
# - Provision demo1 and demo2 tenant databases
# - Seed products, categories, store admins, customers

pnpm db:seed

# Expected output:
# ✓ Platform owner created/verified
# ✓ Themes created (classic, modern, bold)
# ✓ Demo tenant 1 provisioned
#   ✓ Store admin created
#   ✓ Sample products and inventory seeded
# ✓ Demo tenant 2 provisioned
#   ✓ Store admin created
#   ✓ Sample products and inventory seeded
```

## Step 6: Verify Migrations

Test the migration runner:

```bash
# Verify all tenant migrations run cleanly
pnpm db:migrate

# Expected output:
# Fetching tenants...
# Migrating 2 tenant(s)...
# [demo1] ✓ Success
# [demo2] ✓ Success
# ===== Migration Summary =====
# Succeeded: 2
# Failed: 0
# Total: 2
```

Test targeted migration:

```bash
# Re-run migrations for a specific tenant
pnpm db:migrate --tenant=demo1

# Expected: Clean re-run without errors (idempotent)
```

## Step 7: Verify Database State

### Check Control-Plane DB

```bash
psql -U postgres -d platform_control << 'EOF'
-- View platform configuration
SELECT COUNT(*) as platform_owners FROM platform_owners;
SELECT COUNT(*) as themes FROM themes;
SELECT COUNT(*) as tenants FROM tenants;

-- View tenant details
SELECT id, name, subdomain, status FROM tenants;

-- Expected:
-- platform_owners: 1 (owner@example.com)
-- themes: 3 (classic, modern, bold)
-- tenants: 2 (demo1, demo2 with status='active')
EOF
```

### Check Tenant Databases

```bash
# demo1 tenant database
psql -U postgres -d tenant_demo1 << 'EOF'
-- Verify schema created
\dt

-- Check sample data
SELECT COUNT(*) as products FROM products;
SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as store_admins FROM store_admins;

-- Expected:
-- products: 2+ (sample products seeded)
-- customers: 1+ (test customer)
-- store_admins: 1 (admin@demo1.local)
EOF

# demo2 tenant database (same checks)
psql -U postgres -d tenant_demo2 << 'EOF'
SELECT COUNT(*) as products FROM products;
SELECT COUNT(*) as customers FROM customers;
EOF
```

## Step 8: Test Tenant Isolation

Verify each tenant's data is isolated:

```bash
# demo1 schema
psql -U postgres -d tenant_demo1 -c "SELECT name FROM products LIMIT 1;"

# demo2 schema (should be independent)
psql -U postgres -d tenant_demo2 -c "SELECT name FROM products LIMIT 1;"

# Both should show products, but different datasets (created during seed)
```

## Step 9: Build Verification

Type-check all packages:

```bash
pnpm -r run type-check

# Expected: No errors
```

Build all packages:

```bash
pnpm -r run build

# Expected: dist/ folders created in each package with compiled .js and .d.ts files
```

## Deployment Checklist

- [ ] PostgreSQL running (Docker or local)
- [ ] `.env` configured with correct database URL
- [ ] Control-plane database created
- [ ] Control-plane schema applied (001_init.sql)
- [ ] `pnpm db:seed` completed successfully
- [ ] `pnpm db:migrate` passes
- [ ] `pnpm -r run type-check` passes
- [ ] `pnpm -r run build` completes without errors
- [ ] Demo databases `tenant_demo1` and `tenant_demo2` exist
- [ ] Sample data visible in tenant databases

## Next Phase: API Server Deployment

Once the foundation is verified, deploy the API server (Phase 2):

```bash
# Structure will be (when created):
# apps/api/
#   src/
#     middleware/
#       - tenantResolution.ts (resolves tenant from subdomain)
#       - requireSameTenant.ts (security: prevents cross-tenant access)
#     routes/
#       - platform/auth.ts (platform owner login)
#       - admin/products.ts (store admin CRUD)
#       - store/catalog.ts (shopper endpoints)

pnpm -w api dev  # Start API server with hot reload
```

## Troubleshooting

### PostgreSQL Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Verify Postgres is running
docker ps | grep postgres
# OR
psql -U postgres -c "SELECT 1;"

# If Docker: restart container
docker-compose restart postgres
```

### Migration Fails with "Role already exists"

```
Error: role "user_demo1" already exists
```

**Solution:** Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`). This is expected on re-runs. The provisioning script is the only place that creates roles, and it's run by `pnpm db:seed` (one-time bootstrap).

### Missing Module Error

```
Cannot find module '@ecommerce/shared-types'
```

**Solution:**
```bash
# Rebuild workspace links
pnpm install

# Build packages in order
pnpm -w shared-types run build
pnpm -r run build
```

### Database Already Exists

```
Error: database "platform_control" already exists
```

**Solution:** This is expected on second run. The `pnpm db:seed` script checks for existing data and is idempotent.

## Performance Verification

After deployment, verify the multi-tenancy pooling is working:

```bash
# Check that connection pools are created on-demand
# (This happens internally when tenant-runtime receives a request)

# Connection pool stats will be logged when making HTTP requests
# to different tenant subdomains (after API server is running)
```

## Security Checklist

- [ ] SQL injection prevented (slug validation: `/^[a-z0-9-]+$/`)
- [ ] Passwords hashed with bcrypt (10 salt rounds)
- [ ] JWT secrets configured in `.env` (not hardcoded)
- [ ] Per-tenant databases isolated (separate Postgres databases)
- [ ] Admin middleware prevents cross-tenant access (requireSameTenant)
- [ ] Connection pools pooled by tenant (LRU cache, max 50 pools)

## Monitoring

Key things to monitor in production:

1. **Connection Pool Usage**: Max 50 concurrent tenant pools, 5 connections each
2. **Tenant Provisioning**: Check `tenant_provisioning_log` for errors
3. **Migration Runs**: Monitor `migrate-all-tenants.ts` output for per-tenant failures
4. **Tenant Status**: Query `tenants.status` for suspended tenants (403 responses)

## Support

For issues, check:
- `.env` values match environment
- PostgreSQL version is 14+
- Node version is 18+
- pnpm version is 8+
- Control-plane database has all 4 tables
- Tenant databases have all 12 tables

## Deployment Success Indicators

✅ All checks pass if:
- `pnpm db:migrate` shows "Succeeded: 2, Failed: 0"
- `psql -d platform_control -c "SELECT COUNT(*) FROM tenants;"` returns 2
- `psql -d tenant_demo1 -c "SELECT COUNT(*) FROM products;"` returns > 0
- `pnpm -r run build` completes without errors
- No TypeScript errors: `pnpm -r run type-check`

---

**Platform is ready for Phase 2: API Server (Express.js + authentication + routes)**
