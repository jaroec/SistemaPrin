// Auth Types
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'SELLER';
  branch_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Product Types
export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  supplier?: string;
  cost_price: number;
  sale_price: number;
  profit_margin: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  estimated_profit?: number;
}

export interface ProductCreate {
  code: string;
  name: string;
  description?: string;
  category?: string;
  supplier?: string;
  cost_price: number;
  profit_margin: number;
  stock: number;
  min_stock?: number;
}

// Client Types
export interface Client {
  id: number;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit: number;
  balance: number;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

// Sale Types
export type PaymentMethod = 
  | 'EFECTIVO' 
  | 'TRANSFERENCIA' 
  | 'PAGO_MOVIL' 
  | 'BIOPAGO'
  | 'DIVISAS' 
  | 'CREDITO' 
  | 'MIXTO';

export type SaleStatus = 'PENDIENTE' | 'PAGADO' | 'CREDITO' | 'ANULADO';

// ✅ PAYMENT ACTUALIZADO CON NUEVOS CAMPOS
export interface Payment {
  method: PaymentMethod;
  amount_usd: number;
  reference?: string;           // Referencia de pago
  bank?: string;                // Banco receptor
  exchange_rate?: number;       // Tasa de cambio USD -> VES
  amount_secondary?: number;    // Monto en Bs
  change_usd?: number;          // Cambio en USD
  change_secondary?: number;    // Cambio en Bs
}

export interface PaymentOut extends Payment {
  id: number;
  created_at: string;
}

export interface SaleItem {
  product_id: number;
  quantity: number;
}

export interface SaleCreate {
  client_id?: number;  
  client_name?: string;
  client_phone?: string;
  seller_id: number;
  payment_method: PaymentMethod;
  items: SaleItem[];
  payments: Payment[];
  should_print?: boolean;  // ✅ NUEVO: Indicar si se debe imprimir
}

export interface SaleDetail {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price_usd: number;
  subtotal_usd: number;
}

export interface Sale {
  id: number;
  code: string;
  client_id?: number;
  client_name?: string;
  client_phone?: string;
  seller_id: number;
  subtotal_usd: number;
  total_usd: number;
  paid_usd: number;
  balance_usd: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  created_at: string;
  details: SaleDetail[];
  payments: PaymentOut[];
}

// Dashboard Types
export interface DashboardSummary {
  today: {
    sales_count: number;
    total_usd: number;
    paid_usd: number;
    pending_usd: number;
    daily_change_percent: number;
  };
  month: {
    sales_count: number;
    total_usd: number;
  };
  alerts: {
    low_stock_products: number;
    clients_with_debt: number;
    pending_sales: number;
  };
}

export interface RecentSale {
  id: number;
  code: string;
  client_name: string;
  total_usd: number;
  status: SaleStatus;
  created_at: string;
}

// ✅ NUEVO: Exchange Rate Types
export interface ExchangeRate {
  rate: number;
  currency: string;
  last_updated: string;
}

export interface ExchangeRateConfig {
  id?: number;
  rate: number;
  set_by: string;
  set_at: string;
}

export interface PaymentBackend {
  method: string;
  amount_usd: number;
  reference?: string;
}
