import { io } from "socket.io-client";

let socket = null;
let isInitializing = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const initializeSocket = (authUser) => {
  try {
    // Evita múltiplas inicializações simultâneas
    if (isInitializing) {
      console.log("Socket já está sendo inicializado, aguardando...");
      return socket;
    }

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
    const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "https://zhuchat.onrender.com"; 

    console.log("Inicializando novo socket com URL:", BACKEND_URL);

    socket = io(BACKEND_URL, {
      query: { userId: authUser._id },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      forceNew: true,
      autoConnect: true
    });

    socket.on("connect", () => {
      console.log("Socket conectado com ID:", socket.id);
      isInitializing = false;
      reconnectAttempts = 0;
    });

    socket.on("connect_error", (error) => {
      console.error("Erro de conexão socket:", error);
      isInitializing = false;
      
      // Lógica de backoff exponencial para reconexão
      reconnectAttempts++;
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
        console.log(`Tentando reconectar em ${delay/1000} segundos...`);
        setTimeout(() => {
          socket.connect();
        }, delay);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado. Motivo:", reason);

      // Tentar reconectar automaticamente
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log("Tentando reconectar automaticamente...");
        socket.connect();
      }
    });

    // Adicionar listener global para eventos de wallet
    socket.on("wallet_updated", (data) => {
      console.log("Evento de atualização de carteira recebido:", data);
      // Este evento será processado no useWalletStore
    });

    // Melhorado: Debug para eventos do socket
    socket.onAny((eventName, ...args) => {
      console.log(`[DEBUG] Socket evento recebido: ${eventName}`);
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

// Função para enviar mensagem via socket
export const sendMessageViaSocket = (messageData) => {
  if (socket?.connected) {
    socket.emit("sendMessage", messageData);
    return true;
  }
  return false;
};

// Função para enviar mensagem de grupo via socket
export const sendGroupMessageViaSocket = (groupId, messageData) => {
  if (socket?.connected) {
    socket.emit("sendGroupMessage", { groupId, message: messageData });
    return true;
  }
  return false;
};

// Notificar exclusão de mensagem
export const notifyMessageDeleted = (messageId, receiverId) => {
  if (socket?.connected) {
    socket.emit("messageDeleted", messageId, { receiverId });
    return true;
  }
  return false;
};

// Notificar exclusão de mensagem de grupo
export const notifyGroupMessageDeleted = (messageId, groupId) => {
  if (socket?.connected) {
    socket.emit("groupMessageDeleted", { messageId, groupId });
    return true;
  }
  return false;
};