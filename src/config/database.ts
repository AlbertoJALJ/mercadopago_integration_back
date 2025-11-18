import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tienda_online',
});

// Event listeners para el pool
pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(1);
});

// Verificar conexión al inicio
export async function testConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string, 
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
