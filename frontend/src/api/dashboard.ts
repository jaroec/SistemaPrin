import api from './axios';
import { DashboardSummary, RecentSale } from '@/types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>('/api/v1/dashboard/summary');
    return response.data;
  },

  getRecentSales: async (limit = 10): Promise<RecentSale[]> => {
    const response = await api.get<RecentSale[]>('/api/v1/dashboard/recent-sales', {
      params: { limit },
    });
    return response.data;
  },
};