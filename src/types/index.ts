export interface Category {
  id: number;
  server_id?: number;
  name: string;
  status: 'active' | 'inactive';
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  server_id?: number;
  name: string;
  category_id: number;
  image?: string;
  ingredients?: string;
  status: 'active' | 'inactive';
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface ProductOption {
  id: number;
  product_id: number;
  name: string;
  price: number;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface LineExtra {
  id?: number;
  name: string;
  price: number;
}

export interface Customer {
  id: number;
  server_id?: number;
  name: string;
  email: string;
  mobile?: string;
  address?: string;
  status: 'active' | 'inactive';
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface Stock {
  id: number;
  server_id?: number;
  product_id: number;
  net_cost: number;
  sale_cost: number;
  quantity: number;
  status: 'inStock' | 'outStock' | 'lowStock';
  is_active: number;
  cooking_instructions?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface StockAdjustment {
  id: number;
  server_id?: number;
  stock_id: number;
  adjustment_type: 'increase' | 'decrease';
  quantity: number;
  note?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
}

export interface Sale {
  id: number;
  server_id?: number;
  uuid: string;
  customer_id?: number;
  invoice_id?: string;
  net_price: number;
  vat_amount: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  grand_total: number;
  paid_amount?: number;
  buy_price: number;
  sale_type: 'dineIn' | 'takeAway' | 'pickUp';
  table_number?: string;
  postcode?: string;
  address?: string;
  pickup_time?: string;
  cooking_instructions?: string;
  status: 'saveSale' | 'completed' | 'canceled';
  payment_method: 'cash' | 'card' | 'split';
  cash_amount?: number;
  card_amount?: number;
  note?: string;
  synced: number;
  sync_attempts: number;
  last_sync_error?: string;
  created_at: string;
  updated_at?: string;
}

export interface SaleDetail {
  id: number;
  server_id?: number;
  sale_id: number;
  product_id: number;
  stock_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost: number;
  base_price?: number;
  extras?: string;
  removed_ingredients?: string;
  cooking_instructions?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  id: number;
  session_id: string;
  product_id: number;
  stock_id: number;
  quantity: number;
  unit_price: number;
  base_price?: number;
  extras?: string;
  removed_ingredients?: string;
  cooking_instructions?: string;
  created_at: string;
  updated_at?: string;
}
