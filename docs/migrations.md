# Guía de Migraciones con node-pg-migrate

## Conceptos Básicos

Las migraciones son cambios versionados en la estructura de tu base de datos. Cada migración tiene:
- **`up`**: Aplica el cambio (ej: agregar columna)
- **`down`**: Revierte el cambio (rollback)

## Comandos Disponibles

### Crear Nueva Migración

```bash
pnpm migrate:create nombre-descriptivo
```

Ejemplo:
```bash
pnpm migrate:create add-user-avatar
```

Esto crea: `migrations/1763493853527_add-user-avatar.ts`

### Aplicar Migraciones Pendientes

```bash
pnpm migrate:up
```

Ejecuta todas las migraciones que aún no se han aplicado.

### Revertir Última Migración

```bash
pnpm migrate:down
```

⚠️ **Cuidado**: Esto revierte la última migración aplicada. Solo en desarrollo.

### Ver Estado de Migraciones

```bash
pnpm migrate:status
```

Muestra qué migraciones están aplicadas y cuáles faltan.

## Escribir Migraciones

### Estructura Básica

```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Cambios a aplicar
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Cómo revertir los cambios
}
```

### Ejemplos Comunes

#### Agregar Columna

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('orders', {
    shipping_address: { type: 'text' },
    tracking_number: { type: 'varchar(100)' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('orders', ['shipping_address', 'tracking_number']);
}
```

#### Crear Tabla

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('categories', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    slug: { type: 'varchar(255)', notNull: true, unique: true },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('categories');
}
```

#### Crear Índice

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createIndex('products', 'category_id', { 
    name: 'idx_products_category' 
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('products', 'category_id', { 
    name: 'idx_products_category' 
  });
}
```

#### Modificar Columna

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('products', 'price', {
    type: 'decimal(12,2)',  // Cambiar de (10,2) a (12,2)
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('products', 'price', {
    type: 'decimal(10,2)',
  });
}
```

#### Ejecutar SQL Directo

```typescript
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    UPDATE products 
    SET stock = 0 
    WHERE stock < 0
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // No hay forma de revertir esto
  // Dejar vacío si no es reversible
}
```

## Mejores Prácticas

### ✅ DO

- **Nombres descriptivos**: `add-payment-status` mejor que `update-table`
- **Una migración por cambio lógico**: No mezclar features
- **Siempre escribir `down`**: Incluso si es difícil, intenta hacerlo
- **Probar en desarrollo**: Antes de producción, prueba `up` y `down`
- **Backup antes de producción**: Siempre tener respaldo

### ❌ DON'T

- **No editar migraciones ya aplicadas**: Crea una nueva en su lugar
- **No borrar migraciones**: Rompe el historial
- **No usar `down` en producción**: Solo para desarrollo
- **No hacer cambios destructivos sin backup**: Perderás datos

## Flujo de Trabajo

### Desarrollo

```bash
# 1. Crear migración
pnpm migrate:create add-categories

# 2. Editar migrations/XXX_add-categories.ts

# 3. Aplicar
pnpm migrate:up

# 4. Si hay error, revertir y corregir
pnpm migrate:down
# ... corregir código ...
pnpm migrate:up
```

### Producción

```bash
# 1. Hacer backup de la DB
pg_dump tienda_online > backup.sql

# 2. Aplicar migraciones
pnpm migrate:up

# 3. Verificar que todo funciona
# 4. Si algo falla, restaurar backup
```

## Tipos de Datos Comunes

```typescript
{
  // Números
  id: 'id',                                    // SERIAL PRIMARY KEY
  count: { type: 'integer' },                  // INTEGER
  price: { type: 'decimal(10,2)' },           // DECIMAL
  rating: { type: 'real' },                    // FLOAT

  // Strings
  name: { type: 'varchar(255)' },             // VARCHAR
  description: { type: 'text' },               // TEXT
  
  // Booleanos
  is_active: { type: 'boolean' },             // BOOLEAN
  
  // Fechas
  created_at: { 
    type: 'timestamp', 
    default: pgm.func('CURRENT_TIMESTAMP') 
  },
  
  // JSON
  metadata: { type: 'jsonb' },                // JSONB
  
  // Referencias (Foreign Keys)
  user_id: { 
    type: 'integer',
    references: 'users(id)',
    onDelete: 'CASCADE'
  }
}
```

## Troubleshooting

### Error: "Migration already applied"

```bash
# Ver estado
pnpm migrate:status

# La migración ya se aplicó, no necesitas hacer nada
```

### Error: "Column already exists"

La migración ya se ejecutó parcialmente. Opciones:

1. Revertir: `pnpm migrate:down`
2. O arreglar manualmente en la DB y marcar como aplicada

### Migración Atascada

Si una migración falla a la mitad:

```bash
# Verificar estado en DB
SELECT * FROM pgmigrations;

# Corregir manualmente lo necesario en la DB
# Luego volver a intentar
pnpm migrate:up
```

## Integración con CI/CD

En tu pipeline de deployment:

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: pnpm migrate:up
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Referencias

- [node-pg-migrate Docs](https://salsita.github.io/node-pg-migrate/)
- [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html)
