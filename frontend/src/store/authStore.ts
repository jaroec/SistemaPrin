// store/authStore.ts
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

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error("Error backend logout:", error);
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");

        delete api.defaults.headers.common["Authorization"];
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
