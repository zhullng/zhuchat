import { io } from "socket.io-client";

let socket = null;
let isInitializing = false;
let reconnectTimer = null;
let connectionAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 segundos máximo
const BASE_RECONNECT_DELAY = 1000;  // 1 segundo inicial

// Última vez que tentamos unir às salas de grupo
let lastGroupJoinAttempt = 0;

export const initializeSocket = (authUser) => {
  try {
    // Evita múltiplas inicializações simultâneas
    if (isInitializing) {
      console.log("Socket já está sendo inicializado, aguardando...");
      return socket;
    }

    if (!authUser || !authUser._id) {
      console.log("Usuário não autenticado, não inicializando socket");
      return null;
    }

    // Se já existe um socket CONECTADO, retorne ele
    if (socket?.connected) {
      console.log("Socket já conectado (ID:", socket.id + "), reusando");
      
      // Se passou mais de 1 minuto desde a última tentativa de entrar em grupos
      const now = Date.now();
      if (now - lastGroupJoinAttempt > 60000) {
        console.log("Verificando entradas em salas de grupo...");
        socket.emit("reconnectToRooms");
        lastGroupJoinAttempt = now;
      }
      
      return socket;
    }

    isInitializing = true;

    // Se o socket existe mas não está conectado, limpe-o e crie um novo
    if (socket) {
      console.log("Socket existe mas não está conectado, criando um novo");
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    // Cancelar qualquer reconexão agendada
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // URL do backend - usar valor do ambiente ou URL da API
    const BACKEND_URL = import.meta.env.MODE === "development" 
      ? "http://localhost:5001" 
      : "https://zhuchat.onrender.com";

    console.log("Inicializando novo socket com URL:", BACKEND_URL);

    socket = io(BACKEND_URL, {
      query: { userId: authUser._id },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      forceNew: true,
      autoConnect: true
    });

    // ===== Configurar listeners de conexão =====

    // Conexão bem-sucedida
    socket.on("connect", () => {
      console.log("Socket conectado com ID:", socket.id);
      isInitializing = false;
      connectionAttempts = 0;
      
      // Entrar automaticamente em salas de grupo
      socket.emit("reconnectToRooms");
      lastGroupJoinAttempt = Date.now();
      
      // Enviar sinal de presença
      socket.emit("userOnline");
    });

    // Erro de conexão
    socket.on("connect_error", (error) => {
      console.error("Erro de conexão socket:", error);
      isInitializing = false;
      handleReconnect("connect_error");
    });

    // Desconexão
    socket.on("disconnect", (reason) => {
      console.log("Socket desconectado. Motivo:", reason);

      // Tentar reconexão imediata para alguns casos específicos
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log("Desconexão iniciada pelo servidor, tentando reconectar imediatamente...");
        setTimeout(() => {
          socket.connect();
        }, 500);
      } else {
        handleReconnect(reason);
      }
    });

    // Eventos de debug para reconexão
    socket.io.on("reconnect", (attempt) => {
      console.log(`Socket reconectado após ${attempt} tentativas!`);
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`Tentativa de reconexão do socket #${attempt}`);
    });

    socket.io.on("reconnect_error", (error) => {
      console.error("Erro durante tentativa de reconexão:", error);
    });

    // ===== Configurar verificação periódica de saúde =====
    
    // Enviar heartbeat a cada 25 segundos
    const heartbeatInterval = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit("heartbeat");
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 25000);
    
    // Confirmação de heartbeat
    socket.on("heartbeat_ack", () => {
      socket._lastHeartbeat = Date.now();
    });
    
    // Resposta para verificação de status
    socket.on("connectionStatus", (status) => {
      console.log("Status da conexão:", status);
      
      // Se o socket reportar que está em salas, atualize o último timestamp
      if (status.rooms && status.rooms.length > 0) {
        lastGroupJoinAttempt = Date.now();
      }
    });
    
    // ===== Configurar handlers para salas de grupo =====
    
    // Confirmação de reconexão às salas
    socket.on("roomsReconnected", (data) => {
      console.log(`Reconectado a ${data.count} salas de grupo`);
      lastGroupJoinAttempt = Date.now();
    });

    return socket;
  } catch (error) {
    console.error("Erro grave ao inicializar socket:", error);
    isInitializing = false;
    return null;
  }
};

/**
 * Função para gerenciar reconexão com backoff exponencial
 */
const handleReconnect = (reason) => {
  isInitializing = false;
  connectionAttempts++;

  // Calcular tempo de espera com backoff exponencial
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(1.5, connectionAttempts),
    MAX_RECONNECT_DELAY
  );

  console.log(`Agendando reconexão do socket em ${delay}ms (tentativa ${connectionAttempts})`);

  // Cancelar timer existente
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  // Agendar nova tentativa
  reconnectTimer = setTimeout(() => {
    console.log("Executando reconexão agendada do socket...");
    
    if (socket) {
      socket.connect();
    }
    
    reconnectTimer = null;
  }, delay);
};

/**
 * Reconecta forçadamente o socket
 * @param {Object} authUser - Usuário autenticado
 */
export const forceReconnect = (authUser) => {
  if (socket) {
    console.log("Forçando reconexão do socket...");
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
  
  connectionAttempts = 0;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  return initializeSocket(authUser);
};

/**
 * Verifica se o socket está saudável
 */
export const isSocketHealthy = () => {
  return socket?.connected === true;
};

/**
 * Obter o objeto socket atual
 */
export const getSocket = () => {
  return socket;
};

/**
 * Desconectar o socket e limpar recursos
 */
export const disconnectSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  if (socket) {
    console.log("Desconectando socket definitivamente");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  
  connectionAttempts = 0;
  isInitializing = false;
};

/**
 * Ativar log de debug do socket
 */
export const enableSocketDebug = () => {
  if (!socket) return;
  
  localStorage.debug = 'socket.io-client:*';
  console.log("Debug do Socket.IO ativado");
};