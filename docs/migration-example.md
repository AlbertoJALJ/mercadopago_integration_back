# Ejemplo Práctico: Agregar Sistema de Categorías

Este ejemplo muestra cómo crear una nueva migración paso a paso.

## Requisito

Agregar categorías a los productos:
- Tabla `categories` con id, name, slug
- Columna `category_id` en `products`
- Relación foreign key
- Índice para búsquedas rápidas

## Paso 1: Crear Migración

```bash
pnpm migrate:create add-categories
```

Salida:
```
Created migration -- migrations/1763494000000_add-categories.ts
```

## Paso 2: Editar Migración

Abrir `migrations/1763494000000_add-categories.ts` y escribir:

```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Crear tabla categories
  pgm.createTable('categories', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true, unique: true },
    slug: { type: 'varchar(255)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: { 
      type: 'timestamp', 
      notNull: true, 
      default: pgm.func('CURRENT_TIMESTAMP') 
    },
  });

  // 2. Insertar categorías por defecto
  pgm.sql(`
    INSERT INTO categories (name, slug, description) VALUES
    ('Computadoras', 'computadoras', 'Laptops y computadoras de escritorio'),
    ('Periféricos', 'perifericos', 'Mouse, teclados y accesorios'),
    ('Audio', 'audio', 'Audífonos y bocinas'),
    ('Video', 'video', 'Monitores y webcams')
  `);

  // 3. Agregar columna category_id a products
  pgm.addColumn('products', {
    category_id: {
      type: 'integer',
      references: 'categories(id)',
      onDelete: 'SET NULL',
    },
  });

  // 4. Asignar categorías a productos existentes
  pgm.sql(`
    UPDATE products 
    SET category_id = (SELECT id FROM categories WHERE slug = 'computadoras')
    WHERE name LIKE '%Laptop%';

    UPDATE products 
    SET category_id = (SELECT id FROM categories WHERE slug = 'perifericos')
    WHERE name LIKE '%Mouse%' OR name LIKE '%Teclado%';

    UPDATE products 
    SET category_id = (SELECT id FROM categories WHERE slug = 'audio')
    WHERE name LIKE '%Audífonos%';

    UPDATE products 
    SET category_id = (SELECT id FROM categories WHERE slug = 'video')
    WHERE name LIKE '%Monitor%' OR name LIKE '%Webcam%';
  `);

  // 5. Crear índices
  pgm.createIndex('products', 'category_id', { 
    name: 'idx_products_category_id' 
  });
  pgm.createIndex('categories', 'slug', { 
    name: 'idx_categories_slug' 
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Revertir en orden inverso
  pgm.dropIndex('categories', 'slug', { name: 'idx_categories_slug' });
  pgm.dropIndex('products', 'category_id', { name: 'idx_products_category_id' });
  pgm.dropColumn('products', 'category_id');
  pgm.dropTable('categories');
}
```

## Paso 3: Aplicar Migración

```bash
pnpm migrate:up
```

Salida:
```
> Running migration: 1763494000000_add-categories.ts
✅ Migration completed
```

## Paso 4: Verificar

```bash
pnpm migrate:status
```

Salida:
```
┌─────────────────────────────────────┬────────────┐
│ Migration                           │ Status     │
├─────────────────────────────────────┼────────────┤
│ 1763493812703_initial-schema        │ Applied    │
│ 1763493853527_add-payment-columns   │ Applied    │
│ 1763494000000_add-categories        │ Applied    │
└─────────────────────────────────────┴────────────┘
```

## Paso 5: Probar Rollback (Solo en Dev)

```bash
pnpm migrate:down
```

Verifica que las categorías se eliminaron:
```bash
psql -U alberto -d tienda_online -c "SELECT * FROM categories;"
# Error: relation "categories" does not exist ✅
```

Vuelve a aplicar:
```bash
pnpm migrate:up
```

## Paso 6: Actualizar Código TypeScript

### 1. Tipos

```typescript
// src/types/index.ts
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: string;
  stock: number;
  image_url?: string;
  category_id?: number;  // ← Nueva
  created_at: Date;
  updated_at: Date;
}
```

### 2. Servicio de Categorías

```typescript
// src/services/categoryService.ts
import { query } from '../config/database.js';
import { Category } from '../types/index.js';

export async function getAllCategories(): Promise<Category[]> {
  const result = await query<Category>(
    'SELECT * FROM categories ORDER BY name'
  );
  return result.rows;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const result = await query<Category>(
    'SELECT * FROM categories WHERE slug = $1',
    [slug]
  );
  return result.rows[0] || null;
}
```

### 3. Endpoint

```typescript
// src/index.ts
import { getAllCategories } from './services/categoryService.js';

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});
```

## Paso 7: Commit

```bash
git add migrations/
git commit -m "feat: Agregar sistema de categorías para productos"
```

## Resultado Final

Ahora tienes:
- ✅ Tabla `categories` con 4 categorías predefinidas
- ✅ Columna `category_id` en `products`
- ✅ Relación foreign key configurada
- ✅ Índices para mejor performance
- ✅ Rollback funcional
- ✅ Código TypeScript actualizado
- ✅ Endpoint para obtener categorías

## Próximos Pasos

Podrías agregar más migraciones:
- Agregar imágenes a categorías
- Crear tabla de tags
- Relación many-to-many entre products y tags
- Agregar soft deletes
- etc.

Cada cambio = Una nueva migración 🚀
