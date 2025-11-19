# Sistema de Reembolsos

Este documento describe el sistema completo de reembolsos implementado con MercadoPago.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Base de Datos](#base-de-datos)
- [Endpoints del Backend](#endpoints-del-backend)
- [Frontend](#frontend)
- [Webhooks](#webhooks)
- [Pruebas](#pruebas)
- [Limitaciones](#limitaciones)

---

## Arquitectura

El sistema de reembolsos utiliza el **SDK de MercadoPago** (`PaymentRefund`) para:

1. **Crear reembolsos** (totales o parciales)
2. **Consultar estado** de reembolsos
3. **Recibir notificaciones** vía webhook cuando se completa un reembolso

### Flujo del Reembolso

```
┌─────────┐      ┌──────────┐      ┌──────────────┐      ┌─────────┐
│ Usuario │─────▶│ Frontend │─────▶│   Backend    │─────▶│  MP API │
└─────────┘      └──────────┘      └──────────────┘      └─────────┘
                                           │
                                           ▼
                                    ┌──────────┐
                                    │ Database │
                                    └──────────┘
                                           ▲
                                           │
                                    ┌──────────┐
                                    │ Webhook  │◀───── MercadoPago
                                    └──────────┘
```

---

## Base de Datos

### Migración: `add-refund-tracking.js`

Campos agregados a la tabla `orders`:

| Campo          | Tipo           | Descripción                                    |
|----------------|----------------|------------------------------------------------|
| `refund_id`    | varchar(255)   | ID del reembolso en MercadoPago                |
| `refunded_at`  | timestamp      | Fecha y hora del reembolso                     |
| `refund_amount`| decimal(10,2)  | Monto reembolsado (para parciales)             |
| `refund_status`| varchar(50)    | Estado: pending, approved, rejected            |

**Índice:** `orders_refund_id_index` para búsquedas rápidas.

---

## Endpoints del Backend

### 1. Crear Reembolso

**Endpoint:** `POST /api/orders/:id/refund`

**Request Body:**
```json
{
  "amount": 50.00  // Opcional: para reembolso parcial
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "refund_id": 123456789,
  "status": "approved",
  "amount": 100.00,
  "message": "Reembolso procesado exitosamente"
}
```

**Response (Error):**
```json
{
  "error": "Esta orden ya tiene un reembolso procesado",
  "refund_id": "123456789"
}
```

#### Validaciones

✅ Orden existe  
✅ Tiene `payment_id` asociado  
✅ No tiene reembolso previo  
✅ Estado no es `refunded`  
✅ Monto válido (si es parcial)  

#### Flujo Interno

1. **Validar orden** y estado
2. **Crear refund** con SDK: `PaymentRefund.create()`
3. **Actualizar BD** con `refund_id`, `refunded_at`, `refund_amount`, `refund_status`
4. **Cambiar status** de orden a `refunded` o `partially_refunded`

---

### 2. Consultar Reembolso

**Endpoint:** `GET /api/orders/:id/refund`

**Response:**
```json
{
  "order_id": 42,
  "has_refund": true,
  "refund": {
    "id": 123456789,
    "amount": 100.00,
    "status": "approved",
    "date_created": "2024-11-19T12:00:00Z",
    "payment_id": "987654321"
  },
  "local_data": {
    "refunded_at": "2024-11-19T12:00:00",
    "refund_status": "approved",
    "order_status": "refunded"
  }
}
```

---

## Frontend

### Página de Detalles del Pedido

**Ubicación:** `/orders/[id]`

#### Características

- **Botón "Solicitar reembolso"** visible solo si:
  - `payment_status === 'approved'`
  - `status !== 'refunded'`
- **Estados de UI:**
  - ⏳ `Procesando...` durante la llamada
  - ✅ Mensaje de éxito con ID y monto
  - ❌ Mensaje de error
  - 🔄 Recarga automática de datos

#### Código

```typescript
const handleRefund = async () => {
  const confirmed = confirm('¿Estás seguro de solicitar un reembolso?');
  if (!confirmed) return;

  setRefunding(true);

  try {
    const response = await fetch(`${API_URL}/api/orders/${order.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Reembolso procesado!\nID: ${data.refund_id}`);
      fetchOrder(); // Recargar
    }
  } catch (error) {
    alert('❌ Error al procesar el reembolso');
  } finally {
    setRefunding(false);
  }
};
```

---

## Webhooks

### Manejo de Notificaciones

MercadoPago envía webhook con:

```json
{
  "type": "payment",
  "action": "payment.refunded",
  "data": {
    "id": "987654321"  // payment_id
  }
}
```

#### Flujo en el Webhook

1. **Detectar** `action === 'payment.refunded'`
2. **Buscar orden** por `payment_id`
3. **Actualizar estado** a `refunded`
4. **Log** del proceso

```javascript
if (action === 'payment.refunded') {
  const order = await getOrderByPaymentId(paymentId);
  
  await query(
    'UPDATE orders SET status = $1, payment_status = $2 WHERE id = $3',
    ['refunded', 'refunded', order.id]
  );
  
  console.log(`✅ Order ${order.id} marked as refunded via webhook`);
}
```

---

## Pruebas

### Prueba Local (Sin Pagar)

1. **Crear orden de prueba**
2. **Simular pago aprobado:**
   ```bash
   curl -X POST http://localhost:3001/api/dev/simulate-webhook/1 \
     -H "Content-Type: application/json" \
     -d '{"payment_status":"approved"}'
   ```
3. **Solicitar reembolso** desde frontend

### Prueba con MercadoPago Real

1. **Realizar compra real** con tarjeta de prueba
2. **Esperar webhook** de pago aprobado
3. **Solicitar reembolso** desde `/orders/[id]`
4. **Verificar** en panel de MercadoPago

#### Tarjetas de Prueba

| Tarjeta           | Número              | CVV | Resultado |
|-------------------|---------------------|-----|-----------|
| Visa aprobada     | 4242 4242 4242 4242 | 123 | Aprobado  |
| Mastercard        | 5031 7557 3453 0604 | 123 | Aprobado  |

---

## Limitaciones

### 1. **Tiempos de Procesamiento**

- **Tarjeta de crédito:** 10-30 días hábiles
- **Tarjeta de débito:** 10 días hábiles
- **Transferencia bancaria:** 1-2 días hábiles
- **Efectivo:** No reembolsable (se cancela el cupón)

### 2. **Restricciones**

❌ **No se puede reembolsar:**
- Pagos en efectivo (Oxxo, 7-Eleven, etc.)
- Pagos vencidos o expirados
- Pagos fuera del periodo permitido (180 días)

✅ **Se puede reembolsar:**
- Pagos con tarjeta de crédito/débito
- Transferencias bancarias
- Pagos aprobados

### 3. **Reembolsos Parciales**

- Solo **1 reembolso parcial** por pago en algunos casos
- Debe ser menor al monto total
- MercadoPago cobra comisión sobre el monto reembolsado

### 4. **Estados del Reembolso**

| Estado      | Descripción                               |
|-------------|-------------------------------------------|
| `pending`   | En proceso de reembolso                   |
| `approved`  | Completado exitosamente                   |
| `rejected`  | Rechazado (verificar logs de MP)          |

---

## Consideraciones de Seguridad

1. **Validar** que el usuario sea dueño de la orden
2. **Limitar** cantidad de intentos de reembolso
3. **Registrar** todos los eventos en logs
4. **Verificar webhook** con firma de MercadoPago (próxima mejora)

---

## Próximas Mejoras

- [ ] **Reembolsos parciales** desde UI
- [ ] **Historial** de múltiples reembolsos
- [ ] **Motivos** de reembolso (selección de razones)
- [ ] **Notificaciones** por email al usuario
- [ ] **Panel admin** para gestionar reembolsos
- [ ] **Verificación de firma** de webhooks

---

## Troubleshooting

### Error: "El pago no puede ser reembolsado"

**Posibles causas:**
- Pago ya reembolsado
- Pago fuera del periodo permitido
- Método de pago no reembolsable

### Error: "Payment not found"

**Solución:**
- Verificar que `payment_id` existe en la orden
- Verificar que el pago fue procesado por MercadoPago

### Reembolso en "pending"

**Acción:**
- Esperar webhook de MercadoPago
- Consultar estado con `GET /api/orders/:id/refund`
- Verificar logs del backend

---

## Referencias

- [MercadoPago Refunds API](https://www.mercadopago.com.mx/developers/es/reference/chargebacks/_payments_id_refunds/post)
- [SDK Node.js](https://github.com/mercadopago/sdk-nodejs)
- [Webhooks](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)
