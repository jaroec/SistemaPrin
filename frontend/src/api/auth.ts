// api/auth.ts
import api from './axios';
import { LoginCredentials, AuthResponse, User } from '@/types';

export const authApi = {
  /**
   * Login - Autenticación con credenciales OAuth2
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // ✅ OAuth2 requiere application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('username', credentials.username);
    params.append('password', credentials.password);
    
    const response = await api.post<AuthResponse>('/api/v1/auth/token', params, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
    });
    
    // ✅ Guardar token automáticamente
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    
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
    localStorage.removeItem('auth-storage'); // Limpiar Zustand persist
    delete api.defaults.headers.common['Authorization'];
  },

  /**
   * Verificar si el token es válido
   */
  verifyToken: async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      await api.get('/api/v1/auth/me');
      return true;
    } catch {
      authApi.logout();
      return false;
    }
  },
  
  /**
   * Obtener token del localStorage
   */
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },
};
