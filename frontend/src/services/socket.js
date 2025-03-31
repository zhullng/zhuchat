// src/socket.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore.js";

let socket = null;

export const initializeSocket = () => {
  try {
    const authUser = useAuthStore.getState().authUser;
    
    if (!authUser) {
      console.log("Usuário não autenticado, não inicializando socket");
      return null;
    }
    
    // Se já existe um socket conectado, retorne ele
    if (socket?.connected) {
      console.log("Reutilizando socket existente");
      return socket;
    }
    
    // Certifique-se de desconectar qualquer socket existente
    if (socket) {
      console.log("Desconectando socket antigo antes de criar novo");
      socket.disconnect();
      socket = null;
    }
    
    // Obter URL do backend - o domínio deve ser o backend, não o frontend!
    // Você estava usando o URL do frontend como backend
    // Substitua pelo URL correto do seu backend
    const BACKEND_URL = "https://zhuchat-backend.onrender.com"; // Ajuste para a URL real do seu backend
    
    console.log("Inicializando socket com URL:", BACKEND_URL);
    
    // Criar nova conexão com configurações melhoradas
    socket = io(BACKEND_URL, {
      query: { userId: authUser._id },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket', 'polling'], // Tente websocket primeiro, depois polling
    });
    
    // Registrar handlers de eventos com mais logs para depuração
    socket.on("connect", () => {
      console.log("Socket conectado com ID:", socket.id);
    });
    
    socket.on("connect_error", (error) => {
      console.error("Erro de conexão socket:", error);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado. Motivo:", reason);
    });
    
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Tentativa de reconexão #${attemptNumber}`);
    });
    
    return socket;
  } catch (error) {
    console.error("Erro ao inicializar socket:", error);
    return null;
  }
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("Desconectando socket");
    socket.disconnect();
    socket = null;
  }
};