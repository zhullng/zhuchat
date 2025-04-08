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
// lib/socket.js (continuação)
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

io.on("connection", (socket) => {
console.log("Um utilizador conectou-se", socket.id); 

// Obtém o userId a partir dos dados da handshake
const userId = socket.handshake.query.userId;
if (userId) userSocketMap[userId] = socket.id;

// Emite um evento para todos os users conectados
io.emit("getOnlineUsers", Object.keys(userSocketMap));

// Juntar-se a salas de grupo
if (userId) {
  // Buscar grupos do usuário e entrar nas salas correspondentes
  Group.find({ members: userId })
    .then(groups => {
      groups.forEach(group => {
        socket.join(`group-${group._id}`);
        console.log(`Usuário ${userId} entrou automaticamente na sala group-${group._id}`);
      });
    })
    .catch(err => console.error("Erro ao entrar em salas de grupo:", err));
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
  console.log(`Usuário ${userId} entrou manualmente no grupo ${roomName}`);
});

socket.on("leaveGroup", (groupId) => {
  const roomName = `group-${groupId}`;
  socket.leave(roomName);
  console.log(`Usuário ${userId} saiu do grupo ${roomName}`);
});
});

export { io, app, server };