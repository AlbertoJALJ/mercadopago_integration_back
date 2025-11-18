# Backend TypeScript - Tienda Online

API REST construida con Express.js y TypeScript para la tienda online.

## 🚀 Stack Tecnológico

- **Node.js 20+** - Runtime
- **Express 4** - Framework web
- **TypeScript 5** - Tipado estático
- **PostgreSQL** - Base de datos
- **MercadoPago SDK** - Procesamiento de pagos
- **Zod** - Validación de datos

## 📦 Instalación

```bash
cd backend-ts
pnpm install
```

## 🔧 Configuración

1. Copiar el archivo de ejemplo:
```bash
cp .env.example .env
```

2. Editar `.env` con tus credenciales:
```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tienda_online

MERCADOPAGO_ACCESS_TOKEN=TEST-tu-access-token
FRONTEND_URL=http://localhost:4321
WEBHOOK_URL=http://localhost:3001/api/webhook
```

## 🗄️ Base de Datos

### Crear base de datos

```bash
# Si usas Docker
docker exec -it postgres_manual psql -U alberto -c "CREATE DATABASE tienda_online;"

# Si usas PostgreSQL local
psql -U postgres -c "CREATE DATABASE tienda_online;"
```

### Ejecutar migraciones

```bash
# Docker
docker exec -i postgres_manual psql -U alberto -d tienda_online < database/init.sql

# Local
psql -U postgres -d tienda_online -f ../database/init.sql
```

## 🏃 Ejecución

### Modo desarrollo
```bash
pnpm dev
```

El servidor estará disponible en http://localhost:3001

### Build de producción
```bash
pnpm build
pnpm start
```

## 📁 Estructura

```
backend-ts/
├── src/
│   ├── config/
│   │   └── database.ts      # Configuración PostgreSQL
│   ├── services/
│   │   ├── productService.ts # Lógica de productos
│   │   └── orderService.ts   # Lógica de órdenes
│   ├── types/
│   │   └── index.ts          # Tipos TypeScript
│   └── index.ts              # Servidor Express
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Productos

#### GET `/api/products`
Lista todos los productos con stock disponible.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Laptop HP 15\"",
    "description": "Laptop HP con procesador Intel Core i5...",
    "price": "12999.00",
    "stock": 10,
    "image_url": "https://...",
    "created_at": "2024-11-15T...",
    "updated_at": "2024-11-15T..."
  }
]
```

#### GET `/api/products/:id`
Obtiene un producto por ID.

**Response:**
```json
{
  "id": 1,
  "name": "Laptop HP 15\"",
  "price": "12999.00",
  "stock": 10
}
```

### Órdenes

#### POST `/api/orders`
Crea una orden y genera preferencia de MercadoPago.

**Request:**
```json
{
  "customer_name": "Juan Pérez",
  "customer_email": "juan@email.com",
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "order_id": 123,
  "preference_id": "1234567-abc123...",
  "init_point": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=..."
}
```

### Webhook

#### POST `/api/webhook`
Recibe notificaciones de MercadoPago sobre el estado de los pagos.

**Request (MercadoPago):**
```json
{
  "type": "payment",
  "data": {
    "id": "1234567890"
  }
}
```

Actualiza automáticamente el estado de la orden:
- `approved` → `completed`
- `pending` / `in_process` → `processing`
- `rejected` / `cancelled` → `cancelled`

## 🔄 Flujo de Orden

1. Cliente envía `POST /api/orders`
2. Backend valida datos y stock
3. Crea orden en DB con status `pending`
4. Crea preferencia en MercadoPago
5. Actualiza orden con `preference_id`
6. Retorna `init_point` al frontend
7. Frontend redirige a MercadoPago
8. Usuario paga
9. MercadoPago envía webhook a `/api/webhook`
10. Backend actualiza status de la orden
11. Usuario ve página de success/failure/pending

## 🛡️ Validación

Usa **Zod** para validación de requests:

```typescript
const createOrderSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  items: z.array(z.object({
    product_id: z.number().positive(),
    quantity: z.number().positive(),
  })).min(1),
});
```

## 🗃️ Base de Datos

### Tablas

#### `products`
- `id` - Serial, PK
- `name` - Varchar(255), NOT NULL
- `description` - Text
- `price` - Decimal(10,2), NOT NULL
- `stock` - Integer, DEFAULT 0
- `image_url` - Text
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `orders`
- `id` - Serial, PK
- `customer_name` - Varchar(255), NOT NULL
- `customer_email` - Varchar(255), NOT NULL
- `total` - Decimal(10,2), NOT NULL
- `status` - Varchar(50), DEFAULT 'pending'
- `mercadopago_preference_id` - Varchar(255)
- `mercadopago_payment_id` - Varchar(255)
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `order_items`
- `id` - Serial, PK
- `order_id` - Integer, FK → orders(id)
- `product_id` - Integer, FK → products(id)
- `quantity` - Integer, NOT NULL
- `price` - Decimal(10,2), NOT NULL
- `created_at` - Timestamp

## 🐛 Troubleshooting

### Error: Database connection failed
- Verificar que PostgreSQL esté corriendo
- Revisar credenciales en `.env`
- Verificar que la base de datos `tienda_online` exista

### Error: MercadoPago invalid credentials
- Verificar que `MERCADOPAGO_ACCESS_TOKEN` sea válido
- Usar credenciales de TEST para desarrollo
- Obtener en: https://www.mercadopago.com.mx/developers

### Webhook no recibe notificaciones
- MercadoPago solo envía webhooks a URLs públicas
- Para desarrollo local usar: ngrok, localtunnel, etc.
- Configurar `WEBHOOK_URL` con la URL pública

## 🧪 Testing del Flujo de Pago

### Opción 1: Simular Webhook (Recomendado para desarrollo)

Después de hacer un pago de prueba en MercadoPago, simula el webhook manualmente:

```bash
# Reemplaza {order_id} con el ID de tu orden
curl -X POST http://localhost:3001/api/dev/simulate-webhook/{order_id} \
  -H "Content-Type: application/json" \
  -d '{"payment_status": "approved"}'
```

Ejemplo:
```bash
# Simular pago aprobado para la orden 24
curl -X POST http://localhost:3001/api/dev/simulate-webhook/24 \
  -H "Content-Type: application/json" \
  -d '{"payment_status": "approved"}'
```

Estados disponibles: `approved`, `rejected`, `pending`

### Opción 2: Usar ngrok (Para webhooks reales)

Ver documentación completa en: `docs/testing-webhooks.md`

## 📝 Scripts

### Desarrollo
- `pnpm dev` - Servidor con hot reload (tsx watch)
- `pnpm build` - Compilar TypeScript a JavaScript
- `pnpm start` - Ejecutar build de producción

### Migraciones
- `pnpm migrate:create <nombre>` - Crear nueva migración
- `pnpm migrate:up` - Ejecutar migraciones pendientes
- `pnpm migrate:down` - Revertir última migración (solo dev)
- `pnpm migrate:fake` - Marcar migraciones como aplicadas sin ejecutarlas

📖 **Documentación completa**: [docs/migrations.md](./docs/migrations.md)

## 🔗 Enlaces

- [Express.js](https://expressjs.com/)
- [MercadoPago SDK Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Zod](https://zod.dev/)
- [PostgreSQL](https://www.postgresql.org/)
