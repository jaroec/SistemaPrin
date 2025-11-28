import api from './axios';
import { LoginCredentials, AuthResponse, User } from '@/types';

export const authApi = {
  /**
   * Login - Autenticación con credenciales
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post<AuthResponse>('/api/v1/auth/token', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Obtener perfil del usuario autenticado
   */
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/auth/me');
    return response.data;
  },

  /**
   * Registrar nuevo usuario (solo admin)
   */
  register: async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }): Promise<User> => {
    const response = await api.post<User>('/api/v1/auth/register', userData);
    return response.data;
  },

  /**
   * Logout - Limpiar tokens locales
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Verificar si el token es válido
   */
  verifyToken: async (): Promise<boolean> => {
    try {
      await api.get('/api/v1/auth/me');
      return true;
    } catch {
      return false;
    }
  },
};
