import { Pool } from 'pg';

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

  const dbName = `tenant_${slug}`;
  const dbUser = `user_${slug}`;
  const dbPassword = `pwd_${slug}_${Date.now()}`; // Placeholder — use secure generation in production

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
    const tenantId = `tenant_${Date.now()}`;
    const now = new Date().toISOString();

    await controlPlanePool.query(
      `INSERT INTO tenants (id, name, subdomain, db_host, db_name, db_user, db_password, theme_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tenantId, name, slug, dbHost, dbName, dbUser, dbPassword, 'classic', 'active', now]
    );
    onProgress?.('register_tenant', 'success');

    // Step 5: Run migrations (will be done by separate migration script)
    onProgress?.('ready_for_migration', 'success', 'Tenant created, awaiting migrations');

    adminPool.end();

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
