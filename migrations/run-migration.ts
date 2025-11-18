import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tienda_online',
});

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración: add_payment_columns.sql');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const sql = readFileSync(join(__dirname, 'add_payment_columns.sql'), 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migración completada exitosamente');
    
    // Verificar columnas
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
        AND column_name IN ('payment_status', 'payment_id')
    `);
    
    console.log('\n📋 Columnas agregadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
