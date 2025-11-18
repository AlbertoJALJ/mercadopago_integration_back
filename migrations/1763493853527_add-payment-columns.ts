import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add payment tracking columns
  pgm.addColumns('orders', {
    payment_status: { type: 'varchar(50)' },
    payment_id: { type: 'varchar(255)' },
  });

  // Create index for faster payment_id lookups
  pgm.createIndex('orders', 'payment_id', { name: 'idx_orders_payment_id' });

  // Set default status for existing orders
  pgm.sql(`
    UPDATE orders 
    SET payment_status = 'pending' 
    WHERE payment_status IS NULL
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('orders', 'payment_id', { name: 'idx_orders_payment_id' });
  pgm.dropColumns('orders', ['payment_status', 'payment_id']);
}
