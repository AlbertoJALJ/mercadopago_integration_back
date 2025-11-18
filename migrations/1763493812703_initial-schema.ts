import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Products table
  pgm.createTable('products', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price: { type: 'decimal(10,2)', notNull: true },
    stock: { type: 'integer', notNull: true, default: 0 },
    image_url: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // Orders table
  pgm.createTable('orders', {
    id: 'id',
    customer_name: { type: 'varchar(255)', notNull: true },
    customer_email: { type: 'varchar(255)', notNull: true },
    total: { type: 'decimal(10,2)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    mercadopago_preference_id: { type: 'varchar(255)' },
    mercadopago_payment_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // Order items table
  pgm.createTable('order_items', {
    id: 'id',
    order_id: { 
      type: 'integer', 
      notNull: true,
      references: 'orders(id)',
      onDelete: 'CASCADE'
    },
    product_id: { 
      type: 'integer', 
      notNull: true,
      references: 'products(id)'
    },
    quantity: { type: 'integer', notNull: true },
    price: { type: 'decimal(10,2)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  // Create indexes
  pgm.createIndex('orders', 'status', { name: 'idx_orders_status' });
  pgm.createIndex('orders', 'customer_email', { name: 'idx_orders_email' });
  pgm.createIndex('orders', 'mercadopago_payment_id', { name: 'idx_orders_payment_id' });
  pgm.createIndex('order_items', 'order_id', { name: 'idx_order_items_order_id' });
  pgm.createIndex('products', 'stock', { name: 'idx_products_stock' });

  // Insert sample products
  pgm.sql(`
    INSERT INTO products (name, description, price, stock, image_url) VALUES
    ('Laptop HP 15"', 'Laptop HP con procesador Intel Core i5, 8GB RAM, 256GB SSD', 12999.00, 10, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'),
    ('Mouse Logitech', 'Mouse inalámbrico Logitech MX Master 3', 1299.00, 25, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'),
    ('Teclado Mecánico', 'Teclado mecánico RGB con switches Cherry MX', 1899.00, 15, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400'),
    ('Monitor 24"', 'Monitor LG 24" Full HD IPS', 3499.00, 8, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400'),
    ('Webcam HD', 'Webcam Logitech C920 Full HD 1080p', 899.00, 20, 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400'),
    ('Audífonos Bluetooth', 'Audífonos Sony WH-1000XM4 con cancelación de ruido', 5999.00, 12, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400')
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('order_items');
  pgm.dropTable('orders');
  pgm.dropTable('products');
}
