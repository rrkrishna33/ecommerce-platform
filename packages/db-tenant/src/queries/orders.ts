import { Pool } from 'pg';
import type { Order, OrderItem } from '@ecommerce/shared-types';

export async function createOrder(pool: Pool, order: Omit<Order, 'createdAt'>): Promise<Order> {
  const result = await pool.query(
    `INSERT INTO orders (id, customer_id, status, total, shipping_address_id, billing_address_id, payment_reference)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      order.id,
      order.customerId,
      order.status,
      order.total,
      order.shippingAddressId,
      order.billingAddressId,
      order.paymentReference,
    ]
  );
  return mapToOrder(result.rows[0]);
}

export async function getOrderById(pool: Pool, id: string): Promise<Order | null> {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return result.rows[0] ? mapToOrder(result.rows[0]) : null;
}

export async function listOrdersByCustomer(pool: Pool, customerId: string): Promise<Order[]> {
  const result = await pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [
    customerId,
  ]);
  return result.rows.map(mapToOrder);
}

export async function listOrders(pool: Pool, status?: string): Promise<Order[]> {
  let query = 'SELECT * FROM orders';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query(query, params);
  return result.rows.map(mapToOrder);
}

export async function updateOrderStatus(pool: Pool, id: string, status: string): Promise<void> {
  await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateOrderPaymentReference(pool: Pool, id: string, paymentReference: string): Promise<void> {
  await pool.query('UPDATE orders SET payment_reference = $1 WHERE id = $2', [paymentReference, id]);
}

export async function addOrderItem(pool: Pool, item: OrderItem): Promise<OrderItem> {
  const result = await pool.query(
    `INSERT INTO order_items (order_id, variant_id, quantity, unit_price, product_name_snapshot)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [item.orderId, item.variantId, item.quantity, item.unitPrice, item.productNameSnapshot]
  );
  return mapToOrderItem(result.rows[0]);
}

export async function getOrderItems(pool: Pool, orderId: string): Promise<OrderItem[]> {
  const result = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  return result.rows.map(mapToOrderItem);
}

function mapToOrder(row: any): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    total: parseFloat(row.total),
    shippingAddressId: row.shipping_address_id,
    billingAddressId: row.billing_address_id,
    paymentReference: row.payment_reference,
    createdAt: row.created_at,
  };
}

function mapToOrderItem(row: any): OrderItem {
  return {
    orderId: row.order_id,
    variantId: row.variant_id,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price),
    productNameSnapshot: row.product_name_snapshot,
  };
}
