// frontend/src/api/reports.ts
import api from '@/api/axios';

const reportsApi = {
  getSales: async (params?: { from?: string; to?: string }) => {
    const res = await api.get('/api/v1/pos/sales', { params });
    return res.data;
  },
  cancelSale: async (id: number) => {
    const res = await api.post(`/api/v1/pos/sales/${id}/cancel`);
    return res.data;
  },
  // puedes añadir endpoints de resumen, egresos, cuentas por cobrar, etc.
  getSummary: async (params?: any) => {
    const res = await api.get('/api/v1/reports/summary', { params });
    return res.data;
  },
};

export default reportsApi;
