import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';
import { applyTenantMigrations } from '@ecommerce/db-tenant';

export interface ProvisionTenantOptions {
  slug: string;
  name: string;
  dbAdminUser: string;
  dbAdminPassword: string;
  dbHost: string;
  dbPort: number;
  controlPlanePool: Pool;
  onProgress?: (step: string, status: 'start' | 'success' | 'error', message?: string) => void;
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export async function provisionTenant(options: ProvisionTenantOptions): Promise<{
  success: boolean;
  tenantId?: string;
  error?: string;
}> {
  const {
    slug,
    name,
    dbAdminUser,
    dbAdminPassword,
    dbHost,
    dbPort,
    controlPlanePool,
    onProgress,
  } = options;

  // Validate slug to prevent SQL injection
  if (!validateSlug(slug)) {
    const error = 'Invalid slug: must contain only lowercase letters, numbers, and hyphens';
    onProgress?.('validate_slug', 'error', error);
    return { success: false, error };
  }

  const dbName = `tenant_${slug}`;
  const dbUser = `user_${slug}`;
  const dbPassword = randomBytes(24).toString('base64url');
  const tenantId = randomUUID();

  try {
    // Step 1: Create database
    onProgress?.('create_database', 'start');
    const adminPool = new Pool({
      host: dbHost,
      port: dbPort,
      user: dbAdminUser,
      password: dbAdminPassword,
      database: 'postgres',
    });

    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    onProgress?.('create_database', 'success');

    // Step 2: Create database user
    onProgress?.('create_user', 'start');
    await adminPool.query(
      `CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`
    );
    onProgress?.('create_user', 'success');

    // Step 3: Grant privileges
    onProgress?.('grant_privileges', 'start');
    await adminPool.query(
      `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`
    );
    onProgress?.('grant_privileges', 'success');

    // Step 4: Register in control plane
    onProgress?.('register_tenant', 'start');
    const now = new Date().toISOString();

    await controlPlanePool.query(
      `INSERT INTO tenants (id, name, subdomain, db_host, db_port, db_name, db_user, db_password, theme_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [tenantId, name, slug, dbHost, dbPort, dbName, dbUser, dbPassword, 'classic', 'provisioning', now]
    );
    onProgress?.('register_tenant', 'success');

    // Step 5: Run tenant migrations
    onProgress?.('run_migrations', 'start');
    const tenantPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
    });
    await applyTenantMigrations(tenantPool);
    await tenantPool.end();
    onProgress?.('run_migrations', 'success');

    // Step 6: Mark as active
    onProgress?.('activate_tenant', 'start');
    await controlPlanePool.query('UPDATE tenants SET status = $1 WHERE id = $2', ['active', tenantId]);
    onProgress?.('activate_tenant', 'success');

    await adminPool.end();

    return { success: true, tenantId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress?.('error', 'error', message);
    return {
      success: false,
      error: message,
    };
  }
}
