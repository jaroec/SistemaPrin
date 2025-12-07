import api from './axios';

export const usersApi = {
  getAll: async () => {
    const response = await api.get('/api/v1/auth/users');
    return response.data;
  },
  create: async (data: { email: string; password: string; name: string; role: string }) => {
    const response = await api.post('/api/v1/auth/register', data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/v1/auth/users/${id}`);
  },
  updatePassword: async (id: number, newPassword: string) => {
    await api.put(`/api/v1/auth/users/${id}/password`, { password: newPassword });
  },
};
