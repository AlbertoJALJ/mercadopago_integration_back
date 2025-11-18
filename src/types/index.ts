export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  total: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: string;
  created_at: Date;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  items: {
    product_id: number;
    quantity: number;
  }[];
}

export interface CreateOrderResponse {
  order_id: number;
  preference_id: string;
  init_point: string;
}
