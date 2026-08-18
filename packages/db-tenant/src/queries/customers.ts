import { Pool } from 'pg';
import type { Customer } from '@ecommerce/shared-types';

export async function createCustomer(
  pool: Pool,
  customer: Omit<Customer, 'createdAt'>
): Promise<Customer> {
  const result = await pool.query(
    `INSERT INTO customers (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [customer.id, customer.email, customer.passwordHash, customer.name]
  );
  return mapToCustomer(result.rows[0]);
}

export async function getCustomerById(pool: Pool, id: string): Promise<Customer | null> {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  return result.rows[0] ? mapToCustomer(result.rows[0]) : null;
}

export async function getCustomerByEmail(pool: Pool, email: string): Promise<Customer | null> {
  const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
  return result.rows[0] ? mapToCustomer(result.rows[0]) : null;
}

export async function listCustomers(pool: Pool): Promise<Customer[]> {
  const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
  return result.rows.map(mapToCustomer);
}

export async function updateCustomer(pool: Pool, id: string, updates: Partial<Customer>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.passwordHash !== undefined) {
    fields.push(`password_hash = $${paramCount++}`);
    values.push(updates.passwordHash);
  }

  if (fields.length === 0) return;

  values.push(id);
  await pool.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${paramCount}`, values);
}

function mapToCustomer(row: any): Customer {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    createdAt: row.created_at,
  };
}
