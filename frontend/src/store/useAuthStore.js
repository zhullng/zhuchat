import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from "./useChatStore"; // Importação para acessar funções do chat store

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isDeletingAccount: false,
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
      
      // Inicializar conversas visualizadas após autenticação bem-sucedida
      useChatStore.getState().initializeViewedConversations();
      
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
      
      // Inicializar conversas visualizadas após registro bem-sucedido
      useChatStore.getState().initializeViewedConversations();
      
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
      
      // Inicializar conversas visualizadas após login bem-sucedido
      useChatStore.getState().initializeViewedConversations();
      
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
      
      // IMPORTANTE: Resetar o estado do chat ao fazer logout
      useChatStore.getState().resetChatState();
      
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
  },

  forgotPassword: async (email) => {
    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message);
      return { success: true, data: res.data };
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha:", error);
      const errorMessage = error.response?.data?.message || "Erro ao solicitar recuperação de senha";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  },
  
  // For verifying reset token
  verifyResetToken: async (token) => {
    try {
      const res = await axiosInstance.get(`/auth/reset-password/${token}`);
      return { success: true };
    } catch (error) {
      console.error("Token inválido ou expirado:", error);
      const errorMessage = error.response?.data?.message || "Token inválido ou expirado";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  },
  
  // For resetting password
  resetPassword: async (token, password) => {
    try {
      const res = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
      toast.success(res.data.message || "Palavra-passe redefinida com sucesso!");
      return { success: true };
    } catch (error) {
      console.error("Erro ao redefinir palavra-passe:", error);
      const errorMessage = error.response?.data?.message || "Erro ao redefinir palavra-passe";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  },

  // Novas funções para eliminação de conta
  requestAccountDeletion: async () => {
    set({ isDeletingAccount: true });
    try {
      const res = await axiosInstance.post("/auth/delete-account");
      toast.success(res.data.message || "Email para confirmação de eliminação enviado");
      return { success: true, data: res.data };
    } catch (error) {
      console.error("Erro ao solicitar eliminação de conta:", error);
      const errorMessage = error.response?.data?.message || "Erro ao solicitar eliminação de conta";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      set({ isDeletingAccount: false });
    }
  },
  
  // Para verificar token de eliminação
  verifyDeleteToken: async (token) => {
    try {
      const res = await axiosInstance.get(`/auth/delete-account/${token}`);
      return { success: true, email: res.data.email };
    } catch (error) {
      console.error("Token inválido ou expirado:", error);
      const errorMessage = error.response?.data?.message || "Token inválido ou expirado";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  },
  
  // Para confirmar eliminação de conta
  confirmAccountDeletion: async (token) => {
    set({ isDeletingAccount: true });
    try {
      const res = await axiosInstance.post(`/auth/delete-account/${token}`);
      
      // Resetar estado do chat
      useChatStore.getState().resetChatState();
      
      // Limpar dados do usuário
      set({ authUser: null });
      
      // Desconectar socket
      get().disconnectSocket();
      
      toast.success(res.data.message || "Conta eliminada com sucesso");
      return { success: true };
    } catch (error) {
      console.error("Erro ao eliminar conta:", error);
      const errorMessage = error.response?.data?.message || "Erro ao eliminar conta";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      set({ isDeletingAccount: false });
    }
  }
}));