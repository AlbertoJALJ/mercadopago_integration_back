import { query } from '../config/database.js';
import { Product } from '../types/index.js';

export async function getAllProducts(): Promise<Product[]> {
  const result = await query<Product>('SELECT * FROM products WHERE stock > 0 ORDER BY name');
  return result.rows;
}

export async function getProductById(id: number): Promise<Product | null> {
  const result = await query<Product>('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateProductStock(productId: number, quantity: number): Promise<void> {
  await query(
    'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [quantity, productId]
  );
}
