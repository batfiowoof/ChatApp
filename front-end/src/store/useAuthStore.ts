// File: front-end/src/store/useAuthStore.ts
import { create } from "zustand";
import axios from "axios";
import Cookies from "js-cookie";

// Define the API base URL from environment or use default
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5225/api";

interface AuthState {
  // Auth state
  token: string | null;
  username: string | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Auth operations
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
  clearError: () => void;
  setError: (error: string | null) => void;
}

const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  username: null,
  userId: null,
  isLoading: false,
  error: null,
  isAuthenticated:
    typeof window !== "undefined" ? !!localStorage.getItem("token") : false,

  // Auth actions
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_BASE_URL}/Auth/login`, {
        username,
        password,
      });

      if (response.status === 200 && response.data?.token) {
        // Store token in both cookie and localStorage
        const token = response.data.token;
        Cookies.set("token", token, {
          expires: 7,
          sameSite: "strict",
        });
        localStorage.setItem("token", token);

        // Extract user ID from token
        const payload = token.split(".")[1];
        const decodedPayload = JSON.parse(atob(payload));

        // Find the user ID in the token claims
        const userId =
          decodedPayload.sub ||
          decodedPayload[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
          ];

        // Update state
        set({
          token,
          username,
          userId,
          isLoading: false,
          isAuthenticated: true,
        });

        return true;
      }

      set({
        isLoading: false,
        error: "Failed to login. Please check your credentials.",
      });
      return false;
    } catch (err) {
      console.error("Login error:", err);

      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to login. Please try again later.";

      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  register: async (username: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(`${API_BASE_URL}/Auth/register`, {
        username,
        password,
      });

      if (response.status === 200) {
        set({ isLoading: false });
        return true;
      }

      set({ isLoading: false, error: "Failed to register. Please try again." });
      return false;
    } catch (err) {
      console.error("Registration error:", err);

      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to register. Please try again later.";

      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  logout: () => {
    Cookies.remove("token");
    localStorage.removeItem("token");
    set({
      token: null,
      username: null,
      userId: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: () => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    const isAuthenticated = !!token;
    set({ isAuthenticated });
    return isAuthenticated;
  },

  clearError: () => {
    set({ error: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

export default useAuthStore;
