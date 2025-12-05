// ============================================================================
//  store/authStore.ts
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/api/auth";
import api from "@/api/axios";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user: User, token: string) => {
        localStorage.setItem("token", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // ✅ LOGOUT CORREGIDO
      logout: async () => {
        try {
          // 1️⃣ Llamar al backend para revocar el token
          await authApi.logout();
        } catch (error) {
          console.warn("⚠️ Error al revocar token en backend:", error);
          // No throw - continuamos limpiando el frontend aunque falle el backend
        }

        // 2️⃣ Limpiar estado local
        set({
          user: null,
          token: null,
          isAuthenticated: false, 
        });

        // 3️⃣ Limpiar localStorage
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");

        // 4️⃣ Limpiar headers de axios
        delete api.defaults.headers.common["Authorization"];

        // 5️⃣ Redirigir a login (no es responsabilidad de store, pero documentado)
        // El componente que llama logout debe hacer: navigate('/login')
      },

      initAuth: async () => {
        set({ isLoading: true });

        const token = localStorage.getItem("token");

        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        try {
          const isValid = await authApi.verifyToken();

          if (!isValid) {
            await get().logout();
            return;
          }

          const user = await authApi.getProfile();

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          await get().logout();
        }
      },
    }),

    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
