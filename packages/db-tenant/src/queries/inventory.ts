import { Pool } from 'pg';
import type { Inventory } from '@ecommerce/shared-types';

export async function upsertInventory(pool: Pool, inventory: Inventory): Promise<Inventory> {
  const result = await pool.query(
    `INSERT INTO inventory (variant_id, quantity_on_hand, reserved_quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (variant_id) DO UPDATE SET
       quantity_on_hand = $2,
       reserved_quantity = $3
     RETURNING *`,
    [inventory.variantId, inventory.quantityOnHand, inventory.reservedQuantity]
  );
  return mapToInventory(result.rows[0]);
}

export async function getInventoryByVariant(pool: Pool, variantId: string): Promise<Inventory | null> {
  const result = await pool.query('SELECT * FROM inventory WHERE variant_id = $1', [variantId]);
  return result.rows[0] ? mapToInventory(result.rows[0]) : null;
}

export async function updateQuantityOnHand(
  pool: Pool,
  variantId: string,
  quantityOnHand: number
): Promise<void> {
  await pool.query('UPDATE inventory SET quantity_on_hand = $1 WHERE variant_id = $2', [
    quantityOnHand,
    variantId,
  ]);
}

export async function updateReservedQuantity(
  pool: Pool,
  variantId: string,
  reservedQuantity: number
): Promise<void> {
  await pool.query('UPDATE inventory SET reserved_quantity = $1 WHERE variant_id = $2', [
    reservedQuantity,
    variantId,
  ]);
}

function mapToInventory(row: any): Inventory {
  return {
    variantId: row.variant_id,
    quantityOnHand: row.quantity_on_hand,
    reservedQuantity: row.reserved_quantity,
  };
}
