import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      // Garantir que o saldo está definido, mesmo que seja zero
      if (res.data && res.data.balance === undefined) {
        res.data.balance = 0;
      }
      set({ authUser: res.data });
      console.log("Auth check successful, user data:", res.data);
      get().connectSocket();
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      // Garantir que o saldo está definido
      if (res.data && res.data.balance === undefined) {
        res.data.balance = 0;
      }
      set({ authUser: res.data });
      toast.success("Conta criada com sucesso!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Falha no resgitro!");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      // Garantir que o saldo está definido
      if (res.data && res.data.balance === undefined) {
        res.data.balance = 0;
      }
      set({ authUser: res.data });
      toast.success("Sessão iniciada!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Falha no início de sessão!");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Desconectado com sucesso!");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Falha ao desconectar!");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set((state) => ({
        authUser: { ...state.authUser, ...res.data }
      }));
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id }
    });
    socket.connect();

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null });
    }
  }
}));