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


  updatePassword: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-password", data);
      toast.success(res.data.message);
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar palavra-passe:", error);
      const errorMessage = error.response?.data?.message || "Erro ao atualizar palavra-passe";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      // Garantir que o saldo está definido, mesmo que seja zero
      if (res.data && res.data.balance === undefined) {
        res.data.balance = 0;
      }
      set({ authUser: res.data });
      console.log("Verificação de autenticação bem-sucedida, dados do utilizador:", res.data);
      get().connectSocket();
    } catch (error) {
      console.error("Falha na verificação de autenticação:", error);
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
      toast.error(error.response?.data?.message || "Falha no registo!");
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
      toast.success("Sessão terminada com sucesso!");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Falha ao terminar sessão!");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      
      // Extract user data and message
      const { message, ...userData } = res.data;
      
      // Update the user state with the new data
      set((state) => ({
        authUser: { ...state.authUser, ...userData }
      }));
      
      // Show success message
      if (message) {
        toast.success(message);
      } else {
        toast.success("Perfil atualizado com sucesso!");
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erro na atualização do perfil:", error);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        
        // Show first error message as toast
        const firstErrorMessage = Object.values(errors)[0];
        toast.error(firstErrorMessage || "Erro ao atualizar perfil");
        
        // Return errors to the component
        return { success: false, errors };
      } else {
        // Handle general error
        const errorMessage = error.response?.data?.message || "Erro ao atualizar perfil";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
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