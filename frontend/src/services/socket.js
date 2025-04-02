// src/services/socket.js
import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

let socket = null;
let isInitializing = false;
let initializationPromise = null;

export const initializeSocket = () => {
  // Se já existe uma promessa de inicialização, retorne-a
  if (initializationPromise) {
    console.log("Socket já está sendo inicializado, reusando promessa existente");
    return initializationPromise;
  }
  
  // Cria uma nova promessa para inicialização do socket
  initializationPromise = new Promise((resolve, reject) => {
    try {
      // Evita múltiplas inicializações simultâneas
      if (isInitializing) {
        console.log("Socket já está sendo inicializado, aguardando...");
        setTimeout(() => {
          resolve(socket);
        }, 500);
        return;
      }
      
      const authUser = useAuthStore.getState().authUser;
      
      if (!authUser) {
        console.log("Usuário não autenticado, não inicializando socket");
        resolve(null);
        return;
      }
      
      // Se já existe um socket CONECTADO, retorne ele
      if (socket?.connected) {
        console.log("Socket já conectado, reusando");
        resolve(socket);
        return;
      }
      
      isInitializing = true;
      
      // Se o socket existe mas não está conectado, tente reconectar
      if (socket) {
        console.log("Socket existe mas não está conectado, tentando reconectar");
        socket.connect();
        
        if (socket.connected) {
          console.log("Reconexão bem-sucedida");
          isInitializing = false;
          resolve(socket);
          return;
        }
        
        // Se a reconexão falhar, crie um novo socket
        console.log("Falha na reconexão, criando novo socket");
        socket.disconnect();
        socket = null;
      }
      
      // URL do backend - Substitua pelo seu URL real
      const BACKEND_URL = "https://zhuchat.onrender.com"; 
      
      console.log("Inicializando novo socket com URL:", BACKEND_URL);
      
      socket = io(BACKEND_URL, {
        query: { userId: authUser._id },
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true
      });
      
      // Configura os eventos principais
      socket.on("connect", () => {
        console.log("Socket conectado com ID:", socket.id);
        isInitializing = false;
        initializationPromise = null;
        resolve(socket);
      });
      
      socket.on("connect_error", (error) => {
        console.error("Erro de conexão socket:", error);
        isInitializing = false;
        initializationPromise = null;
        reject(error);
      });
      
      socket.on("disconnect", (reason) => {
        console.log("Socket desconectado. Motivo:", reason);
        
        // Tentar reconectar automaticamente em certas situações
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log("Tentando reconectar automaticamente...");
          socket.connect();
        }
      });
      
      // Timeout para caso a conexão não aconteça
      setTimeout(() => {
        if (isInitializing) {
          console.log("Timeout de inicialização do socket");
          isInitializing = false;
          initializationPromise = null;
          reject(new Error("Timeout de conexão"));
        }
      }, 10000);
      
    } catch (error) {
      console.error("Erro ao inicializar socket:", error);
      isInitializing = false;
      initializationPromise = null;
      reject(error);
    }
  });
  
  return initializationPromise;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("Desconectando socket definitivamente");
    socket.disconnect();
    socket = null;
    isInitializing = false;
    initializationPromise = null;
  }
};