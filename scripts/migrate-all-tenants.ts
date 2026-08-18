import { Pool } from 'pg';
import { listAllTenants } from '@ecommerce/db-control-plane';
import { applyTenantMigrations } from '@ecommerce/db-tenant';

const CONTROL_PLANE_DATABASE_URL = process.env.CONTROL_PLANE_DATABASE_URL;

if (!CONTROL_PLANE_DATABASE_URL) {
  console.error('Error: CONTROL_PLANE_DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const controlPlanePool = new Pool({
    connectionString: CONTROL_PLANE_DATABASE_URL,
  });

  try {
    const args = process.argv.slice(2);
    const tenantFilter = args.find((a) => a.startsWith('--tenant='))?.split('=')[1];

    console.log('Fetching tenants...');
    const allTenants = await listAllTenants(controlPlanePool);

    let tenantsToMigrate = allTenants.filter((t) => t.status !== 'suspended');

    if (tenantFilter) {
      tenantsToMigrate = tenantsToMigrate.filter((t) => t.subdomain === tenantFilter);
      if (tenantsToMigrate.length === 0) {
        console.log(`No active tenant found with subdomain: ${tenantFilter}`);
        process.exit(0);
      }
    }

    console.log(`Migrating ${tenantsToMigrate.length} tenant(s)...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const tenant of tenantsToMigrate) {
      try {
        console.log(`[${tenant.subdomain}] Connecting to database...`);
        const tenantPool = new Pool({
          host: tenant.dbHost,
          port: tenant.dbPort,
          database: tenant.dbName,
          user: tenant.dbUser,
          password: tenant.dbPassword,
        });

        console.log(`[${tenant.subdomain}] Running migrations...`);
        await applyTenantMigrations(tenantPool);
        await tenantPool.end();

        console.log(`[${tenant.subdomain}] ✓ Success\n`);
        successCount++;
      } catch (error) {
        failCount++;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[${tenant.subdomain}] ✗ Failed: ${message}\n`);
      }
    }

    console.log(`\n===== Migration Summary =====`);
    console.log(`Succeeded: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total: ${successCount + failCount}`);

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await controlPlanePool.end();
  }
}

main();
