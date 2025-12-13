// frontend/src/api/exchangeRate.ts
import api from './axios';

export interface ExchangeRate {
  id: number;
  rate: number;
  date: string;
  set_by_name: string;
  currency: string;
}

export const exchangeRateApi = {
  /**
   * Obtener la tasa más reciente
   */
  getLatest: async (): Promise<ExchangeRate> => {
    const response = await api.get('/api/v1/exchange-rate/latest');
    return response.data;
  },

  /**
   * Obtener historial de tasas
   */
  getHistory: async (limit = 30): Promise<ExchangeRate[]> => {
    const response = await api.get('/api/v1/exchange-rate/history', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Obtener tasa de hoy
   */
  getToday: async (): Promise<ExchangeRate> => {
    const response = await api.get('/api/v1/exchange-rate/today');
    return response.data;
  },

  /**
   * Crear o actualizar tasa de cambio
   */
  create: async (rate: number, date: string): Promise<ExchangeRate> => {
    const response = await api.post('/api/v1/exchange-rate/', {
      rate,
      date,
    });
    return response.data;
  },

  /**
   * Eliminar tasa de cambio
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/exchange-rate/${id}`);
  },
};
