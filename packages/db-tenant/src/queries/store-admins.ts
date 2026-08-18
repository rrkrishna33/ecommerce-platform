import { Pool } from 'pg';
import type { StoreAdmin } from '@ecommerce/shared-types';

export async function createStoreAdmin(
  pool: Pool,
  admin: Omit<StoreAdmin, 'createdAt'>
): Promise<StoreAdmin> {
  const result = await pool.query(
    `INSERT INTO store_admins (id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [admin.id, admin.email, admin.passwordHash, admin.name, admin.role]
  );
  return mapToStoreAdmin(result.rows[0]);
}

export async function getStoreAdminById(pool: Pool, id: string): Promise<StoreAdmin | null> {
  const result = await pool.query('SELECT * FROM store_admins WHERE id = $1', [id]);
  return result.rows[0] ? mapToStoreAdmin(result.rows[0]) : null;
}

export async function getStoreAdminByEmail(pool: Pool, email: string): Promise<StoreAdmin | null> {
  const result = await pool.query('SELECT * FROM store_admins WHERE email = $1', [email]);
  return result.rows[0] ? mapToStoreAdmin(result.rows[0]) : null;
}

export async function listStoreAdmins(pool: Pool): Promise<StoreAdmin[]> {
  const result = await pool.query('SELECT * FROM store_admins ORDER BY created_at DESC');
  return result.rows.map(mapToStoreAdmin);
}

export async function updateStoreAdmin(pool: Pool, id: string, updates: Partial<StoreAdmin>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramCount++}`);
    values.push(updates.role);
  }
  if (updates.passwordHash !== undefined) {
    fields.push(`password_hash = $${paramCount++}`);
    values.push(updates.passwordHash);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.query(`UPDATE store_admins SET ${fields.join(', ')} WHERE id = $${paramCount}`, values);
}

function mapToStoreAdmin(row: any): StoreAdmin {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}
