// api/auth.ts
import api from "./axios";
import { LoginCredentials, AuthResponse, User } from "@/types";

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const params = new URLSearchParams();
    params.append("username", credentials.username);
    params.append("password", credentials.password);

    const response = await api.post<AuthResponse>(
      "/api/v1/auth/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
      api.defaults.headers.common["Authorization"] =
        "Bearer " + response.data.access_token;
    }

    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>("/api/v1/auth/me");
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    name: string;
    role: string;
  }): Promise<User> => {
    const res = await api.post<User>("/api/v1/auth/register", data);
    return res.data;
  },

  logout: async () => {
    try {
      const token = localStorage.getItem("token");
      await api.post(
        "/api/v1/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (e) {
      console.warn("Logout backend falló:", e);
    } 

    localStorage.removeItem("token");
    localStorage.removeItem("auth-storage");
    delete api.defaults.headers.common["Authorization"];
  },


  verifyToken: async (): Promise<boolean> => {
    try {
      await api.get("/api/v1/auth/me");
      return true;
    } catch {
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
