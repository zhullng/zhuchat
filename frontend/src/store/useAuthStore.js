import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useChatStore } from "./useChatStore";
import { useGroupStore } from "./useGroupStore";
import { 
  initializeSocket, 
  disconnectSocket, 
  forceReconnect, 
  isSocketHealthy 
} from "../services/socket";

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
  socketError: null,
  socketReconnectAttempts: 0,

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
      
      // Inicializar grupos
      useGroupStore.getState().initializeGroups();
      
      // Conectar socket usando o serviço melhorado
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
      
      // Conectar socket
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
      
      // Inicializar grupos
      useGroupStore.getState().initializeGroups();
      
      // Conectar socket
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
      
      // Resetar estado dos grupos
      useGroupStore.getState().resetGroupState();
      
      // Desconectar socket apropriadamente
      disconnectSocket();
      
      set({ 
        authUser: null,
        socket: null,
        socketError: null,
        socketReconnectAttempts: 0,
        onlineUsers: []
      });
      
      toast.success("Sessão terminada com sucesso!");
    } catch (error) {
      // Mesmo com erro no servidor, limpar estado local e desconectar socket
      disconnectSocket();
      
      set({ 
        authUser: null,
        socket: null,
        socketError: null,
        socketReconnectAttempts: 0,
        onlineUsers: []
      });
      
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

  // Método connectSocket melhorado
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return null;

    // Usar a versão melhorada do serviço de socket
    const socket = initializeSocket(authUser);
    
    if (socket) {
      // Resetar contadores de erro
      set({ 
        socket,
        socketError: null,
        socketReconnectAttempts: 0 
      });

      // Configurar listener para usuários online
      socket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });

      return socket;
    }
    
    return null;
  },

  // Método para forçar reconexão do socket
  reconnectSocket: () => {
    const { authUser, socketReconnectAttempts } = get();
    
    if (!authUser) return false;
    
    // Limitar tentativas para evitar loop infinito
    if (socketReconnectAttempts >= 5) {
      console.log("Atingido limite de tentativas de reconexão do socket");
      set({ socketError: "Falha na conexão após várias tentativas" });
      return false;
    }
    
    console.log("Tentando reconectar socket...");
    set(state => ({ socketReconnectAttempts: state.socketReconnectAttempts + 1 }));
    
    const socket = forceReconnect(authUser);
    
    if (socket) {
      set({ socket, socketError: null });
      
      // Reconfigurar listener para usuários online
      socket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });
      
      return true;
    }
    
    set({ socketError: "Falha ao criar nova conexão de socket" });
    return false;
  },

  // Verificar a saúde do socket
  checkSocketHealth: () => {
    const { socket, authUser } = get();
    
    if (!authUser) return false;
    
    // Se não há socket ou ele não está conectado, tenta reconectar
    if (!socket || !isSocketHealthy()) {
      console.log("Socket não está conectado, tentando reconectar...");
      return get().reconnectSocket();
    }
    
    return true;
  },

  disconnectSocket: () => {
    disconnectSocket();
    set({ socket: null });
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

  // Para eliminar conta diretamente (com verificação de saldo)
  deleteAccount: async () => {
    set({ isDeletingAccount: true });
    try {
      const res = await axiosInstance.delete("/auth/delete-account");
      
      // Resetar estado do chat
      useChatStore.getState().resetChatState();
      
      // Limpar dados do utilizador
      set({ authUser: null });
      
      // Desconectar socket
      disconnectSocket();
      set({ 
        socket: null,
        socketError: null,
        socketReconnectAttempts: 0,
        onlineUsers: []
      });
      
      toast.success(res.data.message || "Conta eliminada com sucesso");
      return { success: true };
    } catch (error) {
      console.error("Erro ao eliminar conta:", error);
      
      // Verificar se o erro é devido a saldo na conta
      if (error.response?.data?.hasBalance) {
        const errorMessage = error.response?.data?.message || 
          "Não é possível eliminar a conta enquanto tiver saldo. Por favor, transfira ou utilize o seu saldo antes de eliminar a conta.";
        
        toast.error(errorMessage);
        
        return { 
          success: false, 
          message: errorMessage, 
          hasBalance: true, 
          balance: error.response?.data?.balance || 0 
        };
      }
      
      // Outros erros
      const errorMessage = error.response?.data?.message || "Erro ao eliminar conta";
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      set({ isDeletingAccount: false });
    }
  }
}));