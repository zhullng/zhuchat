import { Server } from "socket.io";
import http from "http";
import express from "express";

// Cria a aplicação Express
const app = express();

// Cria o servidor HTTP a partir da aplicação Express
const server = http.createServer(app);

// Cria uma instância do Server do Socket.IO, associada ao servidor HTTP
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // Permite conexões do domínio especificado
  },
});

// Mapa para armazenar os users online
const userSocketMap = {}; // Exemplo: {userId: socketId}

// Evento de conexão do Socket.IO
io.on("connection", (socket) => {
  console.log("Um utilizador conectou-se", socket.id);

  // Obtém o userId a partir dos dados da handshake (informações de conexão)
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id; // Associa o userId ao socketId

  // Emite um evento para todos os users conectados, com a lista de users online
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Evento de desconexão do Socket.IO
  socket.on("disconnect", () => {
    console.log("Um utilizador desconectou-se", socket.id);
    delete userSocketMap[userId]; // Remove o user desconectado do mapa de users
    io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Emite a lista atualizada de users online
  });

  // Evento para atualizar o saldo de um usuário em tempo real
  socket.on("updateBalance", (userId, newBalance) => {
    const receiverSocketId = userSocketMap[userId];
    if (receiverSocketId) {
      // Envia a atualização de saldo para o usuário específico
      io.to(receiverSocketId).emit("balanceUpdated", newBalance);
    }
  });

  // Evento para emitir quando uma transferência foi realizada
  socket.on("transferCompleted", (senderId, receiverId, amount) => {
    const senderSocketId = userSocketMap[senderId];
    const receiverSocketId = userSocketMap[receiverId];

    if (senderSocketId) {
      // Envia a confirmação de transferência para o remetente
      io.to(senderSocketId).emit("transferNotification", {
        type: "sent",
        amount,
        receiverId,
      });
    }

    if (receiverSocketId) {
      // Envia a confirmação de transferência para o destinatário
      io.to(receiverSocketId).emit("transferNotification", {
        type: "received",
        amount,
        senderId,
      });
    }
  });
});

export { io, app, server };
