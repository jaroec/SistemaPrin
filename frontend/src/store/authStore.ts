// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      /**
       * Establecer autenticación después del login
       */
      setAuth: (user: User, token: string) => {
        localStorage.setItem('token', token);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      /**
       * Cerrar sesión
       */
      logout: () => {
        authApi.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      /**
       * Inicializar autenticación al cargar la app
       * Verifica si hay un token válido en localStorage
       */
      initAuth: async () => {
        try {
          set({ isLoading: true });

          const token = localStorage.getItem('token');
          
          if (!token) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // Verificar si el token es válido
          const isValid = await authApi.verifyToken();

          if (isValid) {
            // Obtener datos actualizados del usuario
            const user = await authApi.getProfile();
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token inválido o expirado
            authApi.logout();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Error al inicializar autenticación:', error);
          authApi.logout();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage', // nombre del item en localStorage
      partialize: (state) => ({
        // Solo persistir estos campos
        user: state.user,
        token: state.token,
      }),
    }
  )
);
