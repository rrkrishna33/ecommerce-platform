import { Pool } from 'pg';
import type { Category } from '@ecommerce/shared-types';

export async function createCategory(
  pool: Pool,
  category: Omit<Category, 'createdAt'>
): Promise<Category> {
  const result = await pool.query(
    `INSERT INTO categories (id, name, slug, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [category.id, category.name, category.slug, category.parentId]
  );
  return mapToCategory(result.rows[0]);
}

export async function listCategories(pool: Pool): Promise<Category[]> {
  const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return result.rows.map(mapToCategory);
}

export async function getCategoryById(pool: Pool, id: string): Promise<Category | null> {
  const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
  return result.rows[0] ? mapToCategory(result.rows[0]) : null;
}

export async function getCategoryBySlug(pool: Pool, slug: string): Promise<Category | null> {
  const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
  return result.rows[0] ? mapToCategory(result.rows[0]) : null;
}

function mapToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    createdAt: row.created_at,
  };
}
