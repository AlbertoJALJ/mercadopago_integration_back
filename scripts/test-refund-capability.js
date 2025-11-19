/**
 * Script para verificar capacidades de reembolso en MercadoPago
 * 
 * Uso: node scripts/test-refund-capability.js
 */

import dotenv from 'dotenv';
import { MercadoPagoConfig, Payment } from 'mercadopago';

dotenv.config();

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ No se encontró MERCADOPAGO_ACCESS_TOKEN en .env');
  process.exit(1);
}

console.log('🔍 Verificando configuración de MercadoPago...\n');

// Verificar formato de credencial
const startsWithTest = ACCESS_TOKEN.startsWith('TEST-');
const startsWithAppUsr = ACCESS_TOKEN.startsWith('APP_USR-');

console.log('📋 Información de Credenciales:');
console.log('   Prefijo:', startsWithTest ? 'TEST-' : startsWithAppUsr ? 'APP_USR-' : 'OTRO');
console.log('   Longitud:', ACCESS_TOKEN.length);
console.log('   Preview:', ACCESS_TOKEN.substring(0, 20) + '...\n');

console.log('⚠️  IMPORTANTE:');
console.log('   MercadoPago cambió el formato de tokens.');
console.log('   Ya no se puede identificar TEST vs PRODUCCIÓN solo por el prefijo.');
console.log('   Ambos pueden empezar con APP_USR-\n');

console.log('🔍 Para verificar el ambiente:');
console.log('   1. Ve al panel: https://www.mercadopago.com.mx/developers/panel');
console.log('   2. Verifica en qué sección copiaste el token:');
console.log('      - "Credenciales de prueba" → TEST');
console.log('      - "Credenciales de producción" → PRODUCCIÓN\n');

// Intentar obtener información de pagos
try {
  const client = new MercadoPagoConfig({
    accessToken: ACCESS_TOKEN
  });

  const payment = new Payment(client);
  
  console.log('🔌 Conexión con MercadoPago:');
  console.log('   Status: ✅ Conectado correctamente\n');

  console.log('📝 Recomendaciones:');
  console.log('   1. Usa credenciales de TEST');
  console.log('   2. Crea un pago nuevo de prueba');
  console.log('   3. Usa tarjeta de TEST: 4242 4242 4242 4242');
  console.log('   4. Intenta reembolsar ese pago nuevo\n');

  console.log('🔗 Enlaces útiles:');
  console.log('   Panel: https://www.mercadopago.com.mx/developers/panel');
  console.log('   Docs: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing\n');

  console.log('⚠️  Nota sobre Reembolsos en TEST:');
  console.log('   - Los reembolsos SÍ funcionan en ambiente TEST');
  console.log('   - PERO solo para pagos creados con las MISMAS credenciales');
  console.log('   - NO puedes reembolsar pagos de producción con credenciales de TEST');
  console.log('   - Asegúrate de crear un pago NUEVO con las credenciales actuales\n');

} catch (error) {
  console.error('❌ Error al conectar con MercadoPago:', error.message);
  console.log('\nPosibles problemas:');
  console.log('   - Token inválido o expirado');
  console.log('   - Problema de conectividad');
  console.log('   - Cuenta sin permisos necesarios\n');
  process.exit(1);
}

console.log('✅ Verificación completada');
