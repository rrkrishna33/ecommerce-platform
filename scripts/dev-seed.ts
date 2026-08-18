import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { hashPassword } from '@ecommerce/auth';
import {
  getPlatformOwnerByEmail,
  createPlatformOwner,
  listAllThemes,
  createTheme,
} from '@ecommerce/db-control-plane';
import { provisionTenant } from '@ecommerce/tenant-runtime';
import {
  createStoreAdmin,
  createCustomer,
  createCategory,
  createProduct,
  createVariant,
  upsertInventory,
} from '@ecommerce/db-tenant';

const CONTROL_PLANE_DATABASE_URL = process.env.CONTROL_PLANE_DATABASE_URL;
const TENANT_DB_HOST = process.env.TENANT_DB_HOST || 'localhost';
const TENANT_DB_PORT = parseInt(process.env.TENANT_DB_PORT || '5432', 10);
const TENANT_DB_ADMIN_USER = process.env.TENANT_DB_ADMIN_USER || 'postgres';
const TENANT_DB_ADMIN_PASSWORD = process.env.TENANT_DB_ADMIN_PASSWORD || 'postgres';
const PLATFORM_ROOT_DOMAIN = process.env.PLATFORM_ROOT_DOMAIN || '127-0-0-1.nip.io';

if (!CONTROL_PLANE_DATABASE_URL) {
  console.error('Error: CONTROL_PLANE_DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const controlPlanePool = new Pool({
    connectionString: CONTROL_PLANE_DATABASE_URL,
  });

  try {
    console.log('🌱 Starting development seed...\n');

    // Ensure platform owner exists
    console.log('Checking platform owner...');
    let owner = await getPlatformOwnerByEmail(controlPlanePool, 'owner@example.com');
    if (!owner) {
      const passwordHash = await hashPassword('password123');
      owner = await createPlatformOwner(controlPlanePool, {
        id: randomUUID(),
        email: 'owner@example.com',
        passwordHash,
        role: 'owner',
      });
      console.log('✓ Created platform owner: owner@example.com');
    } else {
      console.log('✓ Platform owner already exists');
    }

    // Ensure themes exist
    console.log('\nChecking themes...');
    let themes = await listAllThemes(controlPlanePool);
    const themeKeys = ['classic', 'modern', 'bold'];

    for (const key of themeKeys) {
      if (!themes.some((t) => t.key === key)) {
        await createTheme(controlPlanePool, {
          id: randomUUID(),
          key,
          displayName: key.charAt(0).toUpperCase() + key.slice(1),
          configJson: { primary: '#000000', secondary: '#ffffff' },
        });
        console.log(`✓ Created theme: ${key}`);
      }
    }

    // Seed demo tenants
    const demoTenants = [
      { slug: 'demo1', name: 'Demo Store 1' },
      { slug: 'demo2', name: 'Demo Store 2' },
    ];

    console.log('\nProvisioning demo tenants...');
    for (const demo of demoTenants) {
      console.log(`\n📦 ${demo.slug}:`);

      const result = await provisionTenant({
        slug: demo.slug,
        name: demo.name,
        dbAdminUser: TENANT_DB_ADMIN_USER,
        dbAdminPassword: TENANT_DB_ADMIN_PASSWORD,
        dbHost: TENANT_DB_HOST,
        dbPort: TENANT_DB_PORT,
        controlPlanePool,
        onProgress: (step, status, message) => {
          if (status === 'success') {
            console.log(`  ✓ ${step}`);
          } else if (status === 'error') {
            console.error(`  ✗ ${step}: ${message}`);
          }
        },
      });

      if (!result.success) {
        console.error(`Failed to provision ${demo.slug}: ${result.error}`);
        continue;
      }

      // Seed data in the new tenant
      const tenantPool = new Pool({
        host: TENANT_DB_HOST,
        port: TENANT_DB_PORT,
        database: `tenant_${demo.slug}`,
        user: `user_${demo.slug}`,
        password: process.env[`TENANT_${demo.slug.toUpperCase()}_PASSWORD`] || 'temp-password',
      });

      try {
        // Create store admin
        const adminPassword = await hashPassword('admin123');
        const admin = await createStoreAdmin(tenantPool, {
          id: randomUUID(),
          email: `admin@${demo.slug}.local`,
          passwordHash: adminPassword,
          name: `Admin - ${demo.name}`,
          role: 'owner',
        });
        console.log(`  ✓ Created store admin: ${admin.email}`);

        // Create customer
        const customerPassword = await hashPassword('customer123');
        const customer = await createCustomer(tenantPool, {
          id: randomUUID(),
          email: `customer@${demo.slug}.local`,
          passwordHash: customerPassword,
          name: `Customer - ${demo.name}`,
        });
        console.log(`  ✓ Created customer: ${customer.email}`);

        // Create categories
        const category1 = await createCategory(tenantPool, {
          id: randomUUID(),
          name: 'Electronics',
          slug: 'electronics',
          parentId: null,
        });
        console.log(`  ✓ Created category: ${category1.name}`);

        const category2 = await createCategory(tenantPool, {
          id: randomUUID(),
          name: 'Accessories',
          slug: 'accessories',
          parentId: null,
        });

        // Create products
        const product1 = await createProduct(tenantPool, {
          id: randomUUID(),
          categoryId: category1.id,
          name: 'Laptop Pro',
          slug: 'laptop-pro',
          description: 'High-performance laptop for professionals',
          status: 'active',
          basePrice: 1299.99,
        });
        console.log(`  ✓ Created product: ${product1.name}`);

        const product2 = await createProduct(tenantPool, {
          id: randomUUID(),
          categoryId: category2.id,
          name: 'Laptop Case',
          slug: 'laptop-case',
          description: 'Protective case for laptops',
          status: 'active',
          basePrice: 29.99,
        });

        // Create variants and inventory
        const variant1 = await createVariant(tenantPool, {
          id: randomUUID(),
          productId: product1.id,
          sku: 'LAPTOP-PRO-256GB',
          attributes: { storage: '256GB', ram: '16GB' },
          priceOverride: null,
        });

        await upsertInventory(tenantPool, {
          variantId: variant1.id,
          quantityOnHand: 10,
          reservedQuantity: 0,
        });
        console.log(`  ✓ Created variant with inventory`);

        console.log(`  📍 Storefront URL: http://${demo.slug}.${PLATFORM_ROOT_DOMAIN}:5173`);
        console.log(`  📍 Admin URL: http://${demo.slug}-admin.${PLATFORM_ROOT_DOMAIN}:5173`);
      } finally {
        await tenantPool.end();
      }
    }

    console.log('\n✅ Development seed complete!\n');
    console.log('Next steps:');
    console.log(`  1. Start the API server: pnpm run dev -w api`);
    console.log(`  2. Visit a storefront: http://demo1.${PLATFORM_ROOT_DOMAIN}:5173`);
    console.log(`  3. Login as store admin: admin@demo1.local / admin123`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await controlPlanePool.end();
  }
}

main();
