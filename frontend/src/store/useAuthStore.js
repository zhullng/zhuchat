import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

// Cria uma store com zustand para gerir o estado de autenticação e comunicação WebSocket
export const useAuthStore = create((set, get) => ({
  // Estados do store
  authUser: null, // User autenticado (inicialmente é null)
  isSigningUp: false, // Verificar processo de signin
  isLoggingIn: false, // Verificar processo login
  isUpdatingProfile: false, // Verificar o processo de atualização do perfil
  isCheckingAuth: true, // Verificar o estado de autenticação
  onlineUsers: [], // Lista de users online
  socket: null, // Instância do socket para comunicação em tempo real

  // Função para verificar a autenticação do user
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      // Se o user estiver autenticado, armazena os dados do user na store
      set({ authUser: res.data });
      // Conecta o WebSocket para receber atualizações em tempo real
      get().connectSocket();
    } catch (error) {
      console.log("Erro na checagem de autenticação:", error);
      set({ authUser: null }); // Se houver erro, o user é definido como null
    } finally {
      set({ isCheckingAuth: false }); // Checking finalizado
    }
  },

  // Função para registar novo user
  signup: async (data) => {
    set({ isSigningUp: true }); // Início do processo 
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data }); // Armazena os dados do user autenticado
      toast.success("Conta criada com sucesso"); 
      // Conecta o WebSocket após o sucesso
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message); 
      set({ isSigningUp: false }); // SignIn finalizado
    }
  },

  // Função para login do user
  login: async (data) => {
    set({ isLoggingIn: true }); // Início do processo de login
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data }); // Armazena os dados do user autenticado
      toast.success("Login realizado com sucesso"); 

      // Conecta o WebSocket após o login
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message); 
    } finally {
      set({ isLoggingIn: false }); // Login finalizado
    }
  },

  // Função para o logout do user
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null }); // Limpa os dados do user autenticado
      toast.success("Logout realizado com sucesso"); 
      // Desconecta o WebSocket após o logout
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  // Função para atualizar o perfil do user
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true }); //Início do processo de atualização do perfil
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data }); // Atualiza os dados do user autenticado
      toast.success("Perfil atualizado com sucesso"); 
    } catch (error) {
      console.log("Erro na atualização do perfil:", error);
      toast.error(error.response.data.message); 
    } finally {
      set({ isUpdatingProfile: false }); // Update finalizado
    }
  },

  // Função para conectar ao WebSocket
  connectSocket: () => {
    const { authUser } = get(); // Obtém o user autenticado
    // Se não houver user autenticado ou se o WebSocket já estiver conectado, não faz nada
    if (!authUser || get().socket?.connected) return;

    // Cria a instância do socket com o ID do user
    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect(); // Conecta o WebSocket

    set({ socket: socket }); // Armazena a instância do socket na store

    // Executa o evento 'getOnlineUsers' e atualiza a lista de users online
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  // Função para desconectar o WebSocket
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect(); // Desconecta o WebSocket se estiver conectado
  },
}));
