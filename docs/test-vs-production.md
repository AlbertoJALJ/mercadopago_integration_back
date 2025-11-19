# Ambiente TEST vs PRODUCCIÓN

## 🎯 Problema Común: Mezcla de Ambientes

### Error Típico

```
❌ Error processing refund: {
  code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES',
  message: 'At least one policy returned UNAUTHORIZED.',
  status: 403
}
```

### Causa

Intentar **reembolsar un pago de PRODUCCIÓN** usando **credenciales de TEST** (o viceversa).

---

## 📊 Diferencias entre Ambientes

| Aspecto | TEST | PRODUCCIÓN |
|---------|------|------------|
| **Access Token** | `TEST-700889...` | `APP_USR-700889...` |
| **Public Key** | `TEST-8e9f8b...` | `APP_USR-8e9f8b...` |
| **Payment IDs** | Ambiente aislado | Ambiente aislado |
| **Dinero** | 💸 Ficticio | 💰 Real |
| **Tarjetas** | 4242... | Reales |
| **Reembolsos** | ✅ Funciona | ✅ Funciona (certificado) |
| **Base de datos** | Compartida | Compartida |

---

## 🚫 Regla de Oro

> **Un pago solo puede ser reembolsado con las MISMAS credenciales con las que se creó.**

### Ejemplos

✅ **CORRECTO:**
```
Crear pedido → TEST-xxx
Pagar        → TEST-xxx
Reembolsar   → TEST-xxx ✅ Funciona
```

❌ **INCORRECTO:**
```
Crear pedido → APP_USR-xxx (producción)
Pagar        → APP_USR-xxx
Reembolsar   → TEST-xxx ❌ Error 403
```

❌ **INCORRECTO:**
```
Crear pedido → TEST-xxx
Pagar        → TEST-xxx
[Cambias .env a producción]
Reembolsar   → APP_USR-xxx ❌ Error 403
```

---

## ✅ Flujo Correcto para Desarrollo

### 1. Configurar Credenciales de TEST

**backend-ts/.env:**
```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-tu-token-aqui
```

**frontend-nextjs/.env:**
```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-tu-public-key-aqui
```

### 2. Reiniciar Ambos Servidores

```bash
# Terminal 1: Backend
cd backend-ts
# Ctrl+C para detener
pnpm dev

# Terminal 2: Frontend
cd frontend-nextjs
# Ctrl+C para detener
pnpm dev
```

### 3. Crear Pedido Completamente Nuevo

⚠️ **NO intentes reembolsar pedidos antiguos** creados con otras credenciales.

1. Ir a: http://localhost:4321
2. Agregar productos al carrito
3. Checkout con datos ficticios
4. Pagar con tarjeta de TEST: `4242 4242 4242 4242`

### 4. Solicitar Reembolso

Ahora sí, ve a `/orders/[id]` del pedido **nuevo** y solicita el reembolso.

---

## 🔍 Identificar Ambiente de un Pedido

No hay forma directa de saber con qué credenciales se creó un pedido desde la base de datos local.

### Recomendación

Para desarrollo, **elimina pedidos antiguos** cuando cambias de ambiente:

```sql
-- SOLO en desarrollo/local
DELETE FROM order_items;
DELETE FROM orders;

-- O marca pedidos viejos
UPDATE orders SET status = 'archived' 
WHERE created_at < '2024-11-19';
```

---

## 📋 Checklist para Cambio de Ambiente

### Cambiar de PRODUCCIÓN → TEST

- [ ] 1. Actualizar `backend-ts/.env` con `TEST-...`
- [ ] 2. Actualizar `frontend-nextjs/.env` con `TEST-...`
- [ ] 3. Reiniciar backend
- [ ] 4. Reiniciar frontend
- [ ] 5. Limpiar caché del navegador (Ctrl+Shift+R)
- [ ] 6. **NO reembolsar pedidos viejos**
- [ ] 7. Crear pedidos nuevos desde cero
- [ ] 8. Probar reembolsos en pedidos nuevos

### Cambiar de TEST → PRODUCCIÓN

- [ ] 1. ⚠️ **Asegúrate de estar certificado**
- [ ] 2. Actualizar `backend-ts/.env` con `APP_USR-...`
- [ ] 3. Actualizar `frontend-nextjs/.env` con `APP_USR-...`
- [ ] 4. Verificar webhook URL (debe ser HTTPS público)
- [ ] 5. Reiniciar backend
- [ ] 6. Reiniciar frontend
- [ ] 7. **NO reembolsar pedidos de TEST**
- [ ] 8. Probar con pago real pequeño primero

---

## 🧪 Script de Verificación

Ejecuta este script para verificar tu configuración actual:

```bash
node scripts/test-refund-capability.js
```

**Output esperado:**
```
✅ TEST
   - Tipo: TEST
   - Status: Conectado
   - Reembolsos: Disponibles
```

---

## ⚠️ Errores Comunes

### Error 401: "Unauthorized use of live credentials"

**Causa:** Usando credenciales de producción sin certificación.

**Solución:** Cambiar a credenciales de TEST.

### Error 403: "PA_UNAUTHORIZED_RESULT_FROM_POLICIES"

**Causa:** Intentando reembolsar pago de otro ambiente.

**Solución:** Crear pedido nuevo con credenciales actuales.

### Error 404: "Payment not found"

**Causa:** Payment ID no existe en el ambiente actual.

**Solución:** Verificar que el pedido fue creado con las credenciales actuales.

---

## 🎓 Conceptos Clave

### Payment ID

Cada pago tiene un ID único **por ambiente**:

```
TEST: payment_id = 12345     (solo existe en TEST)
PROD: payment_id = 67890     (solo existe en PRODUCCIÓN)
```

Estos IDs **NO se cruzan** entre ambientes.

### Credenciales

Las credenciales son como "llaves" que abren un ambiente específico:

```
TEST-xxx     → Acceso a ambiente TEST
APP_USR-xxx  → Acceso a ambiente PRODUCCIÓN
```

No puedes usar una llave de TEST para acceder a datos de PRODUCCIÓN.

---

## 📚 Referencias

- [MercadoPago - Credenciales](https://www.mercadopago.com.mx/developers/es/docs/credentials)
- [Checkout Pro - Testing](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integration-test)
- [Tarjetas de Prueba](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integration-test/test-cards)
