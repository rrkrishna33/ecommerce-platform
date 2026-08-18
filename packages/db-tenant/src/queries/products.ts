import { Pool } from 'pg';
import type { Product } from '@ecommerce/shared-types';

export async function createProduct(
  pool: Pool,
  product: Omit<Product, 'createdAt'>
): Promise<Product> {
  const result = await pool.query(
    `INSERT INTO products (id, category_id, name, slug, description, status, base_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [product.id, product.categoryId, product.name, product.slug, product.description, product.status, product.basePrice]
  );
  return mapToProduct(result.rows[0]);
}

export async function getProductById(pool: Pool, id: string): Promise<Product | null> {
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] ? mapToProduct(result.rows[0]) : null;
}

export async function getProductBySlug(pool: Pool, slug: string): Promise<Product | null> {
  const result = await pool.query('SELECT * FROM products WHERE slug = $1', [slug]);
  return result.rows[0] ? mapToProduct(result.rows[0]) : null;
}

export async function listProducts(
  pool: Pool,
  status?: string
): Promise<Product[]> {
  let query = 'SELECT * FROM products';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows.map(mapToProduct);
}

export async function listProductsByCategory(pool: Pool, categoryId: string): Promise<Product[]> {
  const result = await pool.query(
    'SELECT * FROM products WHERE category_id = $1 ORDER BY created_at DESC',
    [categoryId]
  );
  return result.rows.map(mapToProduct);
}

export async function updateProductStatus(pool: Pool, id: string, status: string): Promise<void> {
  await pool.query('UPDATE products SET status = $1 WHERE id = $2', [status, id]);
}

function mapToProduct(row: any): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    basePrice: parseFloat(row.base_price),
    createdAt: row.created_at,
  };
}
