import api from './axios';
import { Sale, SaleCreate, Payment } from '@/types';

export const salesApi = {
  /**
   * Crear nueva venta
   */
  create: async (data: SaleCreate): Promise<Sale> => {
    const response = await api.post<Sale>('/api/v1/pos/sales', data);
    return response.data;
  },

  /**
   * Obtener todas las ventas con filtros opcionales
   */
  getAll: async (params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/api/v1/pos/sales', { params });
    return response.data;
  },

  /**
   * Obtener venta por ID
   */
  getById: async (id: number): Promise<Sale> => {
    const response = await api.get<Sale>(`/api/v1/pos/sales/${id}`);
    return response.data;
  },

  /**
   * Obtener ventas del día
   */
  getToday: async (): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/api/v1/pos/sales/today');
    return response.data;
  },

  /**
   * Anular venta
   */
  cancel: async (id: number): Promise<{ detail: string }> => {
    const response = await api.post(`/api/v1/pos/sales/${id}/cancel`);
    return response.data;
  },

  /**
   * Agregar pago a una venta
   */
  addPayment: async (
    id: number,
    payments: Payment[]
  ): Promise<{
    detail: string;
    paid_usd: number;
    balance_usd: number;
    status: string;
  }> => {
    const response = await api.post(`/api/v1/pos/sales/${id}/pay`, payments);
    return response.data;
  },

  /**
   * Buscar ventas por código o cliente
   */
  search: async (query: string): Promise<Sale[]> => {
    const allSales = await salesApi.getAll();
    return allSales.filter(
      (sale) =>
        sale.code.toLowerCase().includes(query.toLowerCase()) ||
        sale.client_name?.toLowerCase().includes(query.toLowerCase())
    );
  },

  /**
   * Obtener estadísticas de ventas
   */
  getStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_sales: number;
    total_amount: number;
    total_paid: number;
    total_pending: number;
  }> => {
    const sales = await salesApi.getAll();
    return {
      total_sales: sales.length,
      total_amount: sales.reduce((sum, s) => sum + s.total_usd, 0),
      total_paid: sales.reduce((sum, s) => sum + s.paid_usd, 0),
      total_pending: sales.reduce((sum, s) => sum + s.balance_usd, 0),
    };
  },
};