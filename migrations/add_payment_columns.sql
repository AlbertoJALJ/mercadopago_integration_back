-- Agregar columnas de pago si no existen
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);

-- Actualizar órdenes existentes con valores por defecto
UPDATE orders 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;

-- Crear índice para búsquedas rápidas por payment_id
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- Verificar columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('payment_status', 'payment_id');
