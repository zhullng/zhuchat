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
    credentials: true
  },
  // Aumentar o tamanho máximo do pacote para suportar imagens
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
  // Aumentar o timeout para evitar desconexões durante uploads
  pingTimeout: 300000, // 5 minutos
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
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Função que retorna o Socket ID do recetor dado o userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

// Mapa para armazenar os users online
const userSocketMap = {}; // Exemplo: {userId: socketId}

// Função para reassociar usuários às suas salas (executada a cada X minutos)
const reassociateUsersToRooms = async () => {
  console.log("Verificando e reassociando usuários às suas salas de grupo...");
  
  for (const [userId, socketId] of Object.entries(userSocketMap)) {
    try {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) continue;
      
      const groups = await Group.find({ members: userId });
      
      groups.forEach(group => {
        const roomName = `group-${group._id}`;
        if (!socket.rooms.has(roomName)) {
          socket.join(roomName);
          console.log(`Reconnected user ${userId} to room ${roomName}`);
        }
      });
    } catch (err) {
      console.error(`Error reassociating user ${userId} to rooms:`, err);
    }
  }
};

// Executar a reassociação a cada 5 minutos
setInterval(reassociateUsersToRooms, 5 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("Um utilizador conectou-se", socket.id); 

  // Obtém o userId a partir dos dados da handshake
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // Emite um evento para todos os users conectados
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Juntar-se a salas de grupo - melhorado para garantir sucesso
  if (userId) {
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
  }

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

  // Evento de desconexão do Socket.IO
  socket.on("disconnect", () => {
    console.log("Um utilizador desconectou-se", socket.id);
    
    // Remover o usuário do mapa e notificar outros
    for (const [key, value] of Object.entries(userSocketMap)) {
      if (value === socket.id) {
        delete userSocketMap[key];
        break;
      }
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
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
    
    // Este é apenas um backup para o fluxo normal da API
    // para garantir que todos recebam a mensagem
    socket.to(roomName).emit("directGroupMessage", {
      senderId: userId,
      text,
      timestamp,
      groupId
    });
  });
});

export { io, app, server };