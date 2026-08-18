import { Pool, QueryResult } from 'pg';
import type { Tenant } from '@ecommerce/shared-types';

export async function getTenantById(
  pool: Pool,
  id: string
): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE id = $1',
    [id]
  );
  return result.rows[0] ? mapToTenant(result.rows[0]) : null;
}

export async function getTenantBySubdomain(
  pool: Pool,
  subdomain: string
): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE subdomain = $1',
    [subdomain]
  );
  return result.rows[0] ? mapToTenant(result.rows[0]) : null;
}

export async function getTenantByCustomDomain(
  pool: Pool,
  domain: string
): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE custom_domain = $1',
    [domain]
  );
  return result.rows[0] ? mapToTenant(result.rows[0]) : null;
}

export async function listAllTenants(pool: Pool): Promise<Tenant[]> {
  const result = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
  return result.rows.map(mapToTenant);
}

export async function createTenant(
  pool: Pool,
  tenant: Omit<Tenant, 'createdAt'>
): Promise<Tenant> {
  const result = await pool.query(
    `INSERT INTO tenants (id, name, subdomain, custom_domain, db_host, db_port, db_name, db_user, db_password, theme_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      tenant.id,
      tenant.name,
      tenant.subdomain,
      tenant.customDomain,
      tenant.dbHost,
      tenant.dbPort,
      tenant.dbName,
      tenant.dbUser,
      tenant.dbPassword,
      tenant.themeId,
      tenant.status,
    ]
  );
  return mapToTenant(result.rows[0]);
}

export async function updateTenantStatus(
  pool: Pool,
  id: string,
  status: string
): Promise<void> {
  await pool.query('UPDATE tenants SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateTenantTheme(
  pool: Pool,
  id: string,
  themeId: string
): Promise<void> {
  await pool.query('UPDATE tenants SET theme_id = $1 WHERE id = $2', [themeId, id]);
}

export async function updateTenantCustomDomain(
  pool: Pool,
  id: string,
  domain: string | null
): Promise<void> {
  await pool.query('UPDATE tenants SET custom_domain = $1 WHERE id = $2', [domain, id]);
}

function mapToTenant(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
    dbHost: row.db_host,
    dbPort: row.db_port,
    dbName: row.db_name,
    dbUser: row.db_user,
    dbPassword: row.db_password,
    themeId: row.theme_id,
    status: row.status,
    createdAt: row.created_at,
  };
}
