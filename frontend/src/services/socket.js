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
        initializationPromise = null;
        resolve(null);
        return;
      }
      
      // Se já existe um socket CONECTADO, retorne ele
      if (socket?.connected) {
        console.log("Socket já conectado, reusando");
        initializationPromise = null;
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
          initializationPromise = null;
          resolve(socket);
          return;
        }
        
        // Se a reconexão falhar, crie um novo socket
        console.log("Falha na reconexão, criando novo socket");
        socket.disconnect();
        socket = null;
      }
      
      // URL do backend com fallback para localhost
      // MODIFICADO: Adicionado fallback para servidor local
      const REMOTE_URL = "https://zhuchat.onrender.com";
      const LOCAL_URL = "http://localhost:5000"; // Ajuste a porta conforme necessário
      
      // Tentar primeiro localhost para desenvolvimento, depois o remoto
      const tryConnection = async (url) => {
        console.log(`Tentando conectar a: ${url}`);
        
        const newSocket = io(url, {
          query: { userId: authUser._id },
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 5000,
          auth: { userId: authUser._id }, // Adicionado campo de autenticação
          autoConnect: true
        });
        
        return new Promise((resolveConn, rejectConn) => {
          // Setup eventos
          const onConnect = () => {
            console.log(`Socket conectado a ${url} com ID:`, newSocket.id);
            newSocket.off("connect", onConnect);
            newSocket.off("connect_error", onConnectError);
            resolveConn(newSocket);
          };
          
          const onConnectError = (error) => {
            console.log(`Erro ao conectar a ${url}:`, error.message);
            newSocket.off("connect", onConnect);
            newSocket.off("connect_error", onConnectError);
            newSocket.disconnect();
            rejectConn(error);
          };
          
          // Adicionar listeners
          newSocket.on("connect", onConnect);
          newSocket.on("connect_error", onConnectError);
          
          // Timeout
          setTimeout(() => {
            if (!newSocket.connected) {
              newSocket.off("connect", onConnect);
              newSocket.off("connect_error", onConnectError);
              newSocket.disconnect();
              rejectConn(new Error("Timeout de conexão"));
            }
          }, 5000);
        });
      };
      
      // Tentar conectar primeiro localmente, depois remotamente
      tryConnection(LOCAL_URL)
        .then((connectedSocket) => {
          socket = connectedSocket;
          setupCommonSocketEvents(socket);
          isInitializing = false;
          initializationPromise = null;
          resolve(socket);
        })
        .catch(() => {
          // Falha ao conectar localmente, tentar remotamente
          console.log("Tentando servidor remoto...");
          tryConnection(REMOTE_URL)
            .then((connectedSocket) => {
              socket = connectedSocket;
              setupCommonSocketEvents(socket);
              isInitializing = false;
              initializationPromise = null;
              resolve(socket);
            })
            .catch((error) => {
              console.error("Não foi possível conectar a nenhum servidor:", error);
              isInitializing = false;
              initializationPromise = null;
              reject(new Error("Não foi possível conectar ao servidor"));
            });
        });
      
    } catch (error) {
      console.error("Erro ao inicializar socket:", error);
      isInitializing = false;
      initializationPromise = null;
      reject(error);
    }
  });
  
  return initializationPromise;
};

// Configurar eventos comuns para o socket
function setupCommonSocketEvents(socket) {
  socket.on("disconnect", (reason) => {
    console.log("Socket desconectado. Motivo:", reason);
    
    // Tentar reconectar automaticamente em certas situações
    if (reason === 'io server disconnect' || reason === 'transport close') {
      console.log("Tentando reconectar automaticamente...");
      setTimeout(() => {
        socket.connect();
      }, 1000);
    }
  });
  
  // Logar eventos importantes
  socket.onAny((event, ...args) => {
    if (event.startsWith('webrtc:') || event.startsWith('call:')) {
      console.log(`[SOCKET] Evento recebido: ${event}`, args);
    }
  });
}

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

// Verificar conectividade do socket
export const isSocketConnected = () => {
  return !!socket?.connected;
};

// Enviar evento para o servidor
export const emitSocketEvent = (event, data, callback) => {
  if (!socket?.connected) {
    console.error("Socket não conectado, não é possível enviar evento:", event);
    return callback ? callback({ success: false, error: "Socket não conectado" }) : null;
  }
  
  return socket.emit(event, data, callback);
};