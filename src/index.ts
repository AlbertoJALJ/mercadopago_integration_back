import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { z } from 'zod';
import { getAllProducts, getProductById } from './services/productService.js';
import {
  createOrder,
  updateOrderStatus,
  updateOrderPreferenceId,
  getOrderByPaymentId,
  getAllOrders,
  getOrderWithItems,
} from './services/orderService.js';
import type { CreateOrderRequest, CreateOrderResponse } from './types/index.js';
import { testConnection, query } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// MercadoPago configuration
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4321',
  credentials: true,
}));
app.use(express.json());

// Request validation schemas
const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Nombre requerido'),
  customer_email: z.string().email('Email inválido'),
  items: z.array(z.object({
    product_id: z.number().positive(),
    quantity: z.number().positive(),
  })).min(1, 'Al menos un producto requerido'),
});

// Routes

// GET /api/products - Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id - Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const product = await getProductById(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/orders - Create order and MercadoPago preference
app.post('/api/orders', async (req, res) => {
  try {
    // Validate request
    const validatedData = createOrderSchema.parse(req.body) as CreateOrderRequest;

    // Get products and validate stock
    const orderItems = [];
    let total = 0;

    for (const item of validatedData.items) {
      const product = await getProductById(item.product_id);
      
      if (!product) {
        return res.status(404).json({ error: `Producto ${item.product_id} no encontrado` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` 
        });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      total += itemTotal;

      orderItems.push({
        product_id: product.id,
        quantity: item.quantity,
        price: product.price,
        product,
      });
    }

    // Create order in database
    const order = await createOrder(
      validatedData.customer_name,
      validatedData.customer_email,
      orderItems,
      total
    );

    // Create MercadoPago preference
    const mpItems = orderItems.map(item => ({
      id: item.product.id.toString(),
      title: item.product.name,
      quantity: item.quantity,
      unit_price: parseFloat(item.product.price),
      currency_id: 'MXN',
    }));

    const preference = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4321';
    
    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: validatedData.customer_name,
          email: validatedData.customer_email,
        },
        back_urls: {
          success: `${frontendUrl}/success?order_id=${order.id}`,
          failure: `${frontendUrl}/failure?order_id=${order.id}`,
          pending: `${frontendUrl}/pending?order_id=${order.id}`,
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
        },
        statement_descriptor: 'TIENDA ONLINE',
        external_reference: order.id.toString(),
        notification_url: process.env.WEBHOOK_URL || `http://localhost:${PORT}/api/webhook`,
      },
    });

    // Update order with preference ID
    await updateOrderPreferenceId(order.id, result.id!);

    const response: CreateOrderResponse = {
      order_id: order.id,
      preference_id: result.id!,
      init_point: result.init_point!,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

// GET /api/orders - Obtener todos los pedidos
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/orders/:id - Obtener detalles de un pedido
app.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID de pedido inválido' });
    }

    const order = await getOrderWithItems(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
});

// GET /api/orders/:id/status - Verificar estado de orden
app.get('/api/orders/:id/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    const result = await query<{ 
      id: number; 
      status: string; 
      payment_status: string | null;
      payment_id: string | null;
    }>(
      'SELECT id, status, payment_status, payment_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = result.rows[0];
    
    res.json({
      order_id: order.id,
      status: order.status,
      payment_status: order.payment_status || 'pending',
      payment_id: order.payment_id,
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Error al obtener estado de la orden' });
  }
});

// POST /api/webhook - MercadoPago webhook
app.post('/api/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('📥 Webhook received:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Get payment details
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('💳 Payment info:', {
        id: paymentInfo.id,
        status: paymentInfo.status,
        external_reference: paymentInfo.external_reference,
      });

      // Find order by external reference (order_id)
      const orderId = parseInt(paymentInfo.external_reference || '0');
      
      if (!orderId) {
        console.error('❌ No order ID in payment external_reference');
        return res.sendStatus(400);
      }

      // Update order status based on payment status
      let orderStatus: string;
      const paymentStatus = paymentInfo.status || 'pending';
      
      switch (paymentStatus) {
        case 'approved':
          orderStatus = 'completed';
          break;
        case 'pending':
        case 'in_process':
          orderStatus = 'processing';
          break;
        case 'rejected':
        case 'cancelled':
          orderStatus = 'cancelled';
          break;
        default:
          orderStatus = 'pending';
      }

      await updateOrderStatus(orderId, orderStatus, paymentId.toString(), paymentStatus);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.sendStatus(500);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// DEV ONLY: Simular webhook (útil para desarrollo local sin ngrok)
app.post('/api/dev/simulate-webhook/:orderId', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const orderId = parseInt(req.params.orderId);
    const { payment_status = 'approved' } = req.body;

    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    // Simular actualización de webhook
    const fakePaymentId = `SIMULATED_${Date.now()}`;
    let orderStatus: string;

    switch (payment_status) {
      case 'approved':
        orderStatus = 'completed';
        break;
      case 'pending':
        orderStatus = 'processing';
        break;
      case 'rejected':
        orderStatus = 'cancelled';
        break;
      default:
        orderStatus = 'pending';
    }

    await updateOrderStatus(orderId, orderStatus, fakePaymentId, payment_status);

    console.log(`🧪 [DEV] Webhook simulado - Orden ${orderId}: ${payment_status}`);

    res.json({
      success: true,
      message: 'Webhook simulado exitosamente',
      order_id: orderId,
      payment_status,
      order_status: orderStatus,
    });
  } catch (error) {
    console.error('Error simulando webhook:', error);
    res.status(500).json({ error: 'Error al simular webhook' });
  }
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Products: http://localhost:${PORT}/api/products`);
      console.log(`🛒 Orders: http://localhost:${PORT}/api/orders`);
      console.log(`📡 Webhook: http://localhost:${PORT}/api/webhook`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
