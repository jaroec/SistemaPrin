// api/axios.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Crear instancia de axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Interceptor de Request: Agregar token automáticamente
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    
    // Agregar token si existe
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ Interceptor de Response: Manejar errores de autenticación
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Error 401: Token inválido o expirado
    if (error.response?.status === 401) {
      console.warn('🚫 Token inválido o expirado');
      
      // Limpiar datos de autenticación
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirigir al login solo si no estamos ya en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Error 403: Sin permisos
    if (error.response?.status === 403) {
      console.error('⛔ Acceso denegado. No tienes permisos para esta acción.');
    }
    
    // Error 404: No encontrado
    if (error.response?.status === 404) {
      console.error('🔍 Recurso no encontrado');
    }
    
    // Error 500: Error del servidor
    if (error.response?.status === 500) {
      console.error('💥 Error del servidor');
    }
    
    return Promise.reject(error);
  }
);

export default api;
