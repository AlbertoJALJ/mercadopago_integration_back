import { query, pool } from '../config/database.js';
import { Order, OrderItem } from '../types/index.js';

export async function createOrder(
  customerName: string,
  customerEmail: string,
  items: { product_id: number; quantity: number; price: string }[],
  total: number
): Promise<Order> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Crear orden
    const orderResult = await client.query<Order>(
      `INSERT INTO orders (customer_name, customer_email, total, status) 
       VALUES ($1, $2, $3, 'pending') 
       RETURNING *`,
      [customerName, customerEmail, total]
    );
    const order = orderResult.rows[0];

    // Crear items de la orden
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );

      // Actualizar stock
      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(
  orderId: number,
  status: string,
  paymentId?: string
): Promise<void> {
  if (paymentId) {
    await query(
      'UPDATE orders SET status = $1, mercadopago_payment_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [status, paymentId, orderId]
    );
  } else {
    await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, orderId]
    );
  }
}

export async function updateOrderPreferenceId(
  orderId: number,
  preferenceId: string
): Promise<void> {
  await query(
    'UPDATE orders SET mercadopago_preference_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [preferenceId, orderId]
  );
}

export async function getOrderByPaymentId(paymentId: string): Promise<Order | null> {
  const result = await query<Order>(
    'SELECT * FROM orders WHERE mercadopago_payment_id = $1',
    [paymentId]
  );
  return result.rows[0] || null;
}

export async function getOrderById(orderId: number): Promise<Order | null> {
  const result = await query<Order>(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );
  return result.rows[0] || null;
}
