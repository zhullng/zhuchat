// src/socket.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

let socket = null;

export const initializeSocket = () => {
  try {
    const authUser = useAuthStore.getState().authUser;
    
    if (!authUser) {
      console.log("Usuário não autenticado, não inicializando socket");
      return null;
    }
    
    // Desconectar qualquer socket existente para garantir conexão limpa
    if (socket) {
      console.log("Desconectando socket existente para reconectar");
      socket.disconnect();
      socket = null;
    }
    
    // URL do backend - ajuste para seu servidor real
    const BACKEND_URL = "https://zhuchat.onrender.com"; 
    
    console.log("Inicializando novo socket com URL:", BACKEND_URL);
    
    socket = io(BACKEND_URL, {
      query: { userId: authUser._id },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true
    });
    
    socket.on("connect", () => {
      console.log("Socket conectado com ID:", socket.id);
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado. Motivo:", reason);
      
      // Tentar reconectar automaticamente em caso de desconexão inesperada
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log("Tentando reconectar automaticamente...");
        socket.connect();
      }
    });
    
    // Adicionar handler específico para eventos de chamada para debugging
    socket.on("call:incoming", (data) => {
      console.log("🔔 EVENTO CALL:INCOMING RECEBIDO!", data);
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