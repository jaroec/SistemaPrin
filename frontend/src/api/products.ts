import api from './axios';
import { Product, ProductCreate } from '@/types';

export const productsApi = {
  /**
   * Obtener todos los productos
   */
  getAll: async (activeOnly = true): Promise<Product[]> => {
    const response = await api.get<Product[]>('/api/v1/products', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  /**
   * Obtener producto por ID
   */
  getById: async (id: number): Promise<Product> => {
    const response = await api.get<Product>(`/api/v1/products/${id}`);
    return response.data;
  },

  /**
   * Buscar productos (para POS)
   */
  search: async (query: string, limit = 20): Promise<Product[]> => {
    const response = await api.get<Product[]>('/api/v1/products/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Buscar producto por código de barras
   */
  getByBarcode: async (barcode: string): Promise<Product> => {
    const response = await api.get<Product>(`/api/v1/products/barcode/${barcode}`);
    return response.data;
  },

  /**
   * Crear nuevo producto
   */
  create: async (data: ProductCreate): Promise<Product> => {
    const response = await api.post<Product>('/api/v1/products', data);
    return response.data;
  },

  /**
   * Actualizar producto existente
   */
  update: async (id: number, data: Partial<ProductCreate>): Promise<Product> => {
    const response = await api.put<Product>(`/api/v1/products/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar producto (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/products/${id}`);
  },

  /**
   * Obtener productos con bajo stock
   */
  getLowStock: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/api/v1/products/alerts/low-stock');
    return response.data;
  },

  /**
   * Reabastecer producto
   */
  restock: async (id: number, amount: number): Promise<Product> => {
    const response = await api.put<Product>(`/api/v1/products/${id}/restock`, null, {
      params: { amount },
    });
    return response.data;
  },

  /**
   * Obtener resumen del inventario
   */
  getSummary: async (): Promise<{
    total_products: number;
    low_stock_alerts: number;
    total_cost_value_usd: number;
    total_sale_value_usd: number;
    total_profit_potential_usd: number;
  }> => {
    const response = await api.get('/api/v1/products/summary');
    return response.data;
  },
};