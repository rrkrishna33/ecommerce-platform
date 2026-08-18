import { Pool } from 'pg';
import type { Cart, CartItem } from '@ecommerce/shared-types';

export async function createCart(pool: Pool, cart: Omit<Cart, 'id'>): Promise<Cart> {
  const id = `cart_${Date.now()}`;
  const result = await pool.query(
    `INSERT INTO carts (id, customer_id, status)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, cart.customerId, cart.status]
  );
  return mapToCart(result.rows[0]);
}

export async function getCartById(pool: Pool, id: string): Promise<Cart | null> {
  const result = await pool.query('SELECT * FROM carts WHERE id = $1', [id]);
  return result.rows[0] ? mapToCart(result.rows[0]) : null;
}

export async function getActiveCartByCustomer(pool: Pool, customerId: string): Promise<Cart | null> {
  const result = await pool.query('SELECT * FROM carts WHERE customer_id = $1 AND status = $2', [
    customerId,
    'active',
  ]);
  return result.rows[0] ? mapToCart(result.rows[0]) : null;
}

export async function updateCartStatus(pool: Pool, cartId: string, status: string): Promise<void> {
  await pool.query('UPDATE carts SET status = $1 WHERE id = $2', [status, cartId]);
}

export async function addCartItem(pool: Pool, item: CartItem): Promise<CartItem> {
  const result = await pool.query(
    `INSERT INTO cart_items (cart_id, variant_id, quantity, price_at_add)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = $3, price_at_add = $4
     RETURNING *`,
    [item.cartId, item.variantId, item.quantity, item.priceAtAdd]
  );
  return mapToCartItem(result.rows[0]);
}

export async function getCartItems(pool: Pool, cartId: string): Promise<CartItem[]> {
  const result = await pool.query('SELECT * FROM cart_items WHERE cart_id = $1', [cartId]);
  return result.rows.map(mapToCartItem);
}

export async function removeCartItem(pool: Pool, cartId: string, variantId: string): Promise<void> {
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2', [cartId, variantId]);
}

export async function clearCart(pool: Pool, cartId: string): Promise<void> {
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
}

function mapToCart(row: any): Cart {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
  };
}

function mapToCartItem(row: any): CartItem {
  return {
    cartId: row.cart_id,
    variantId: row.variant_id,
    quantity: row.quantity,
    priceAtAdd: parseFloat(row.price_at_add),
  };
}
