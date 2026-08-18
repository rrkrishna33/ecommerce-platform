import { Pool } from 'pg';
import type { ProductVariant } from '@ecommerce/shared-types';

export async function createVariant(
  pool: Pool,
  variant: Omit<ProductVariant, 'imageUrl'>
): Promise<ProductVariant> {
  const result = await pool.query(
    `INSERT INTO product_variants (id, product_id, sku, attributes, price_override, image_url)
     VALUES ($1, $2, $3, $4, $5, NULL)
     RETURNING *`,
    [variant.id, variant.productId, variant.sku, JSON.stringify(variant.attributes), variant.priceOverride]
  );
  return mapToVariant(result.rows[0]);
}

export async function getVariantById(pool: Pool, id: string): Promise<ProductVariant | null> {
  const result = await pool.query('SELECT * FROM product_variants WHERE id = $1', [id]);
  return result.rows[0] ? mapToVariant(result.rows[0]) : null;
}

export async function getVariantBySku(pool: Pool, sku: string): Promise<ProductVariant | null> {
  const result = await pool.query('SELECT * FROM product_variants WHERE sku = $1', [sku]);
  return result.rows[0] ? mapToVariant(result.rows[0]) : null;
}

export async function listVariantsByProduct(pool: Pool, productId: string): Promise<ProductVariant[]> {
  const result = await pool.query(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sku ASC',
    [productId]
  );
  return result.rows.map(mapToVariant);
}

export async function updateVariantImageUrl(pool: Pool, id: string, imageUrl: string): Promise<void> {
  await pool.query('UPDATE product_variants SET image_url = $1 WHERE id = $2', [imageUrl, id]);
}

function mapToVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    attributes: row.attributes || {},
    priceOverride: row.price_override ? parseFloat(row.price_override) : null,
    imageUrl: row.image_url,
  };
}
