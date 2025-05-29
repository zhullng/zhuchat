import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";

// Cria a aplicação Express
const app = express();

// Cria o servidor HTTP a partir da aplicação Express
const server = http.createServer(app);

// Cria uma instância do Server do Socket.IO, associada ao servidor HTTP com configurações otimizadas
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  // Aumentar o tamanho máximo do pacote para suportar imagens
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
  // Aumentar o timeout para evitar desconexões durante uploads
  pingTimeout: 300000, // 5 minutos
  pingInterval: 25000, // 25 segundos para ping mais frequente
  // Priorizar WebSocket para melhor desempenho
  transports: ["websocket", "polling"],
  // Configurações adicionais para otimização
  perMessageDeflate: {
    threshold: 1024, // Comprimir mensagens maiores que 1KB
    zlibDeflateOptions: {
      level: 6, // Nível de compressão (0-9, onde 9 é máxima compressão)
      memLevel: 8 // Nível de memória (1-9, onde 9 usa mais memória)
    }
  },
  // Retry connection
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  // Melhorar performance e lidar com clientes atrás de proxies
  allowUpgrades: true,
  upgradeTimeout: 10000,
  connectTimeout: 45000
});

// Função que retorna o Socket ID do recetor dado o userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

// Mapa para armazenar os users online
const userSocketMap = {}; // Exemplo: {userId: socketId}

// Mapa para múltiplas conexões por usuário
const userSocketsMultiMap = {}; // Exemplo: {userId: Set[socketId1, socketId2...]}

// Função para reassociar usuários às suas salas (executada a cada X minutos)
const reassociateUsersToRooms = async () => {
  console.log("Verificando e reassociando usuários às suas salas de grupo...");
  
  for (const [userId, socketId] of Object.entries(userSocketMap)) {
    try {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) continue;
      
      const groups = await Group.find({ members: userId });
      
      if (groups && groups.length > 0) {
        for (const group of groups) {
          const roomName = `group-${group._id}`;
          if (!socket.rooms.has(roomName)) {
            socket.join(roomName);
            console.log(`Reconnected user ${userId} to room ${roomName}`);
          }
        }
        console.log(`Verificado: Usuário ${userId} está em ${groups.length} salas de grupo`);
      }
    } catch (err) {
      console.error(`Error reassociating user ${userId} to rooms:`, err);
    }
  }
};

// Executar a reassociação a cada 3 minutos para garantir conexões mais rápidas
setInterval(reassociateUsersToRooms, 3 * 60 * 1000);

// Verificar conexões a cada minuto
const checkSocketConnections = () => {
  console.log("Verificando integridade das conexões de socket...");
  let socketsRemovidos = 0;
  
  // Verificar cada socket e remover os que estão desconectados
  for (const [userId, socketId] of Object.entries(userSocketMap)) {
    const socket = io.sockets.sockets.get(socketId);
    
    if (!socket || !socket.connected) {
      console.log(`Removendo socket desconectado ${socketId} para usuário ${userId}`);
      delete userSocketMap[userId];
      
      // Remover também do multi-map
      if (userSocketsMultiMap[userId]) {
        userSocketsMultiMap[userId].delete(socketId);
        if (userSocketsMultiMap[userId].size === 0) {
          delete userSocketsMultiMap[userId];
        }
      }
      
      socketsRemovidos++;
    }
  }
  
  if (socketsRemovidos > 0) {
    // Atualizar lista de usuários online para todos
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    console.log(`${socketsRemovidos} conexões inválidas removidas`);
  }
};

// Executar verificação a cada minuto
setInterval(checkSocketConnections, 60 * 1000);

io.on("connection", (socket) => {
  console.log("Um utilizador conectou-se", socket.id); 

  // Obtém o userId a partir dos dados da handshake
  const userId = socket.handshake.query.userId;
  
  if (!userId) {
    console.log("Conexão rejeitada: userId não fornecido");
    socket.disconnect(true);
    return;
  }
  
  // Registrar no mapa principal de sockets
  userSocketMap[userId] = socket.id;
  
  // Registrar na estrutura para múltiplas conexões
  if (!userSocketsMultiMap[userId]) {
    userSocketsMultiMap[userId] = new Set();
  }
  userSocketsMultiMap[userId].add(socket.id);
  
  console.log(`Usuário ${userId} conectado com socket ${socket.id}. Total conexões: ${userSocketsMultiMap[userId].size}`);

  // Emite um evento para todos os users conectados
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Juntar-se a salas de grupo - melhorado para garantir sucesso
  // Buscar grupos do usuário e entrar nas salas correspondentes
  Group.find({ members: userId })
    .then(groups => {
      if (groups && groups.length > 0) {
        groups.forEach(group => {
          const roomName = `group-${group._id}`;
          socket.join(roomName);
          console.log(`Usuário ${userId} entrou automaticamente na sala ${roomName}`);
        });
        console.log(`Usuário ${userId} entrou em ${groups.length} salas de grupo`);
      } else {
        console.log(`Usuário ${userId} não tem grupos para entrar`);
      }
    })
    .catch(err => {
      console.error(`Erro ao entrar em salas de grupo para usuário ${userId}:`, err);
    });

  // Evento específico para indicar "digitando"
  socket.on("typing", (data) => {
    if (data.to) {
      const receiverSocketId = userSocketMap[data.to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: data.from || userId });
      }
    }
  });

  // Evento específico para indicar "parou de digitar"
  socket.on("stopTyping", (data) => {
    if (data.to) {
      const receiverSocketId = userSocketMap[data.to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { from: data.from || userId });
      }
    }
  });

  // Eventos para verificação de conexão e diagnóstico
  socket.on("heartbeat", () => {
    socket.emit("heartbeat_ack");
  });
  
  socket.on("checkConnection", () => {
    socket.emit("connectionStatus", {
      connected: true,
      socketId: socket.id,
      userId: userId,
      rooms: Array.from(socket.rooms).filter(room => room !== socket.id)
    });
  });
  
  // Evento para reconectar explicitamente a todas as salas
  socket.on("reconnectToRooms", async () => {
    try {
      const groups = await Group.find({ members: userId });
      let joinedCount = 0;
      
      if (groups && groups.length > 0) {
        for (const group of groups) {
          const roomName = `group-${group._id}`;
          if (!socket.rooms.has(roomName)) {
            socket.join(roomName);
            joinedCount++;
          }
        }
        
        console.log(`Reconexão solicitada: Usuário ${userId} reconectado a ${joinedCount} salas de grupo`);
        socket.emit("roomsReconnected", { 
          success: true, 
          count: joinedCount,
          groups: groups.map(g => g._id.toString())
        });
      } else {
        console.log(`Reconexão solicitada: Usuário ${userId} não tem grupos para entrar`);
        socket.emit("roomsReconnected", { success: true, count: 0, groups: [] });
      }
    } catch (err) {
      console.error(`Erro ao reconectar usuário ${userId} às salas:`, err);
      socket.emit("roomsReconnected", { success: false, error: "Falha na reconexão" });
    }
  });
  
  // Evento de desconexão do Socket.IO melhorado
  socket.on("disconnect", (reason) => {
    console.log(`Usuário desconectou-se: Socket ${socket.id}, Razão: ${reason}`);
    
    // Remover este socket específico das conexões do usuário
    if (userSocketsMultiMap[userId]) {
      userSocketsMultiMap[userId].delete(socket.id);
      
      // Se ainda houver outras conexões, manter o usuário online
      if (userSocketsMultiMap[userId].size > 0) {
        console.log(`Usuário ${userId} ainda tem ${userSocketsMultiMap[userId].size} conexões ativas`);
        
        // Atualizar o socket ID principal
        const remainingSockets = Array.from(userSocketsMultiMap[userId]);
        userSocketMap[userId] = remainingSockets[0]; // Usar o primeiro socket disponível
        
        // Não atualizar a lista de usuários online, pois o usuário ainda está conectado
        return;
      }
      
      // Se não houver mais conexões, remover dos mapas
      delete userSocketsMultiMap[userId];
    }
    
    // Remover o usuário do mapa principal
    if (userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      
      // Notificar todos os clientes sobre a mudança na lista de usuários online
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  // Eventos específicos para grupos
  socket.on("joinGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.join(roomName);
    
    // Listar todos os clientes na sala para depuração
    const clients = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    console.log(`Usuário ${userId} entrou manualmente no grupo ${roomName}. Total de clientes na sala: ${clients}`);
  });

  socket.on("leaveGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.leave(roomName);
    console.log(`Usuário ${userId} saiu do grupo ${roomName}`);
  });

  // Backup para garantir entrega de mensagens
  socket.on("sendGroupMessage", (data) => {
    const { groupId, text, timestamp } = data;
    const roomName = `group-${groupId}`;
    
    console.log(`Usuário ${userId} está tentando enviar mensagem direta para ${roomName}`);
    
    // MODIFICADO: Enviar para todos na sala EXCETO o remetente
    // Isso evita que o remetente receba sua própria mensagem de volta
    socket.to(roomName).emit("directGroupMessage", {
      senderId: userId,
      text,
      timestamp,
      groupId
    });
  });
});

// Função para enviar mensagem para todos os sockets de um usuário
export function sendToAllUserSockets(userId, eventName, data) {
  if (!userId || !eventName) return false;
  
  try {
    let sentCount = 0;
    
    // Enviar para todos os sockets deste usuário
    if (userSocketsMultiMap[userId]) {
      const sockets = Array.from(userSocketsMultiMap[userId]);
      
      sockets.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit(eventName, data);
          sentCount++;
        }
      });
    } else {
      // Fallback para o modo antigo
      const socketId = userSocketMap[userId];
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.connected) {
          socket.emit(eventName, data);
          sentCount++;
        }
      }
    }
    
    return sentCount > 0;
  } catch (error) {
    console.error(`Erro ao enviar evento para usuário ${userId}:`, error);
    return false;
  }
}

// Função para broadcast para todos os membros de um grupo
export function broadcastToGroup(groupId, eventName, data, excludeUserId = null) {
  if (!groupId || !eventName) return false;
  
  try {
    const roomName = `group-${groupId}`;
    
    if (excludeUserId) {
      // Se tivermos que Eliminar um usuário específico e ele tem múltiplos sockets
      if (userSocketsMultiMap[excludeUserId] && userSocketsMultiMap[excludeUserId].size > 0) {
        const socketIds = Array.from(userSocketsMultiMap[excludeUserId]);
        
        // Emite para todos na sala EXCETO os sockets do usuário
        socketIds.forEach(socketId => {
          io.to(roomName).except(socketId).emit(eventName, data);
        });
      } else {
        // Modo antigo - apenas um socket por usuário
        const socketId = userSocketMap[excludeUserId];
        if (socketId) {
          io.to(roomName).except(socketId).emit(eventName, data);
        } else {
          io.to(roomName).emit(eventName, data);
        }
      }
    } else {
      // Enviar para todos na sala sem exceção
      io.to(roomName).emit(eventName, data);
    }
    
    return true;
  } catch (error) {
    console.error(`Erro ao fazer broadcast para grupo ${groupId}:`, error);
    return false;
  }
}

export { io, app, server };