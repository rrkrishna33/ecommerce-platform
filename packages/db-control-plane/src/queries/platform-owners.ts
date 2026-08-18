import { Pool } from 'pg';
import type { PlatformOwner } from '@ecommerce/shared-types';

export async function getPlatformOwnerById(
  pool: Pool,
  id: string
): Promise<PlatformOwner | null> {
  const result = await pool.query(
    'SELECT * FROM platform_owners WHERE id = $1',
    [id]
  );
  return result.rows[0] ? mapToPlatformOwner(result.rows[0]) : null;
}

export async function getPlatformOwnerByEmail(
  pool: Pool,
  email: string
): Promise<PlatformOwner | null> {
  const result = await pool.query(
    'SELECT * FROM platform_owners WHERE email = $1',
    [email]
  );
  return result.rows[0] ? mapToPlatformOwner(result.rows[0]) : null;
}

export async function createPlatformOwner(
  pool: Pool,
  owner: PlatformOwner
): Promise<void> {
  await pool.query(
    'INSERT INTO platform_owners (id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [owner.id, owner.email, owner.passwordHash, owner.role]
  );
}

function mapToPlatformOwner(row: any): PlatformOwner {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}
