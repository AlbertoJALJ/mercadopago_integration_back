/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Agregar columnas para tracking de reembolsos
  pgm.addColumns('orders', {
    refund_id: {
      type: 'varchar(255)',
      notNull: false,
      comment: 'MercadoPago refund ID'
    },
    refunded_at: {
      type: 'timestamp',
      notNull: false,
      comment: 'Timestamp cuando se procesó el reembolso'
    },
    refund_amount: {
      type: 'decimal(10,2)',
      notNull: false,
      comment: 'Monto reembolsado (para reembolsos parciales)'
    },
    refund_status: {
      type: 'varchar(50)',
      notNull: false,
      comment: 'Estado del reembolso: pending, approved, rejected'
    }
  });

  // Agregar índice para búsquedas por refund_id
  pgm.createIndex('orders', 'refund_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Eliminar índice
  pgm.dropIndex('orders', 'refund_id');
  
  // Eliminar columnas
  pgm.dropColumns('orders', [
    'refund_id',
    'refunded_at',
    'refund_amount',
    'refund_status'
  ]);
};
