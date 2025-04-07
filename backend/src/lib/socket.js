import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";

const app = express();
const server = http.createServer(app);

// Configuração do Socket.IO com opções avançadas
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
  transports: ['websocket', 'polling']
});

// Mapa de usuários online
const userSocketMap = {};

// Função para obter socket de um usuário
export const getReceiverSocketId = (userId) => userSocketMap[userId];

// Função para emitir para um grupo específico
export const emitToGroup = (groupId, event, data) => {
  const roomName = `group-${groupId}`;
  io.to(roomName).emit(event, data);
};

io.on("connection", (socket) => {
  console.log("Novo usuário conectado", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId) {
    // Mapear socket do usuário
    userSocketMap[userId] = socket.id;
    
    // Notificar todos usuários online
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Entrar automaticamente em salas de grupos
    try {
      Group.find({ members: userId })
        .then(groups => {
          groups.forEach(group => {
            const roomName = `group-${group._id}`;
            socket.join(roomName);
            console.log(`Usuário ${userId} entrou na sala ${roomName}`);
          });
        })
        .catch(err => console.error("Erro ao entrar em salas de grupo:", err));
    } catch (error) {
      console.error("Erro inesperado ao processar salas:", error);
    }
  }

  // Eventos de grupo
  socket.on("joinGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.join(roomName);
    console.log(`Usuário ${userId} juntou-se ao grupo ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.leave(roomName);
    console.log(`Usuário ${userId} saiu do grupo ${groupId}`);
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log("Usuário desconectado", socket.id);
    
    // Remover mapeamento de socket
    for (const [key, value] of Object.entries(userSocketMap)) {
      if (value === socket.id) {
        delete userSocketMap[key];
        break;
      }
    }
    
    // Notificar usuários online
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server, userSocketMap };