// src/socket.js - Modificado para manter estado
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

let socket = null;
let isInitializing = false;

export const initializeSocket = () => {
  try {
    // Evita múltiplas inicializações simultâneas
    if (isInitializing) {
      console.log("Socket já está sendo inicializado, aguardando...");
      return socket;
    }
    
    const authUser = useAuthStore.getState().authUser;
    
    if (!authUser) {
      console.log("Usuário não autenticado, não inicializando socket");
      return null;
    }
    
    // Se já existe um socket CONECTADO, retorne ele
    if (socket?.connected) {
      console.log("Socket já conectado, reusando");
      return socket;
    }
    
    isInitializing = true;
    
    // Se o socket existe mas não está conectado, tente reconectar
    if (socket) {
      console.log("Socket existe mas não está conectado, tentando reconectar");
      socket.connect();
      
      if (socket.connected) {
        console.log("Reconexão bem-sucedida");
        isInitializing = false;
        return socket;
      }
      
      // Se a reconexão falhar, crie um novo socket
      console.log("Falha na reconexão, criando novo socket");
      socket.disconnect();
      socket = null;
    }
    
    // URL do backend
    const BACKEND_URL = "https://zhuchat.onrender.com"; 
    
    console.log("Inicializando novo socket com URL:", BACKEND_URL);
    
    socket = io(BACKEND_URL, {
      query: { userId: authUser._id },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true
    });
    
    socket.on("connect", () => {
      console.log("Socket conectado com ID:", socket.id);
      isInitializing = false;
    });
    
    socket.on("connect_error", (error) => {
      console.error("Erro de conexão socket:", error);
      isInitializing = false;
    });
    
    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado. Motivo:", reason);
      
      // Tentar reconectar automaticamente
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log("Tentando reconectar automaticamente...");
        socket.connect();
      }
    });
    
    socket.on("call:incoming", (data) => {
      console.log("🚨 EVENTO CALL:INCOMING RECEBIDO!", data);
      // Usar temporariamente alert como fallback bruto
      alert(`CHAMADA RECEBIDA DE ${data.callerName || 'alguém'}!`);
    });
    
    return socket;
  } catch (error) {
    console.error("Erro ao inicializar socket:", error);
    isInitializing = false;
    return null;
  }
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("Desconectando socket definitivamente");
    socket.disconnect();
    socket = null;
  }
};