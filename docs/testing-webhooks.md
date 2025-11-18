# Testing Webhooks en Desarrollo Local

## Problema

MercadoPago necesita enviar notificaciones (webhooks) a tu servidor cuando un pago se completa. En desarrollo local (`localhost`), MercadoPago **NO puede llegar** a tu servidor.

## Solución: Usar ngrok

### 1. Instalar ngrok

```bash
# macOS con Homebrew
brew install ngrok

# O descargar de https://ngrok.com/download
```

### 2. Iniciar ngrok

En una terminal separada:

```bash
ngrok http 3001
```

Verás algo como:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

### 3. Actualizar .env

```bash
WEBHOOK_URL=https://abc123.ngrok-free.app/api/webhook
```

**⚠️ Importante:** Cada vez que reinicies ngrok, la URL cambiará. Necesitas actualizar `.env`.

### 4. Reiniciar el backend

```bash
pnpm dev
```

## Alternativa: Simular Webhook Manualmente

Si no quieres usar ngrok, puedes simular el webhook manualmente después de hacer un pago de prueba:

### 1. Obtener el payment_id

Después de completar un pago en MercadoPago, revisa la URL o la respuesta. Verás algo como:

```
https://www.mercadopago.com.mx/checkout/v1/payment/.../congrats?payment_id=123456789
```

### 2. Llamar al webhook manualmente

```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

Reemplaza `123456789` con el ID real del pago.

## Verificar que Funciona

Después de que el webhook se ejecute, deberías ver en los logs del backend:

```
📥 Webhook received: { type: 'payment', data: { id: '123456789' } }
💳 Payment info: { id: 123456789, status: 'approved', external_reference: '24' }
✅ Orden 24 actualizada: status=completed, payment_status=approved
```

Y en el frontend, el polling detectará el cambio y redirigirá a `/success`.

## Troubleshooting

### El webhook nunca llega

- ✅ Verifica que ngrok está corriendo
- ✅ Verifica que `WEBHOOK_URL` en `.env` es la URL de ngrok
- ✅ Reinicia el backend después de cambiar `.env`

### El webhook llega pero no actualiza la orden

- ✅ Verifica que el `external_reference` del pago coincide con el `order_id`
- ✅ Revisa los logs del backend para ver errores
- ✅ Verifica que las columnas `payment_status` y `payment_id` existen en la DB

### El polling no detecta el cambio

- ✅ Verifica que el webhook se ejecutó correctamente
- ✅ Consulta la DB directamente: `SELECT * FROM orders WHERE id = X;`
- ✅ Revisa la consola del navegador para ver los logs del polling
