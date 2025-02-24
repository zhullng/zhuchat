import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// Função que retorna o Socket ID do recetor dado o userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("Usuário conectado", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("Usuário desconectado", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("updateBalance", (userId, newBalance) => {
    if (userSocketMap[userId]) {
      io.to(userSocketMap[userId]).emit("balanceUpdated", newBalance);
    }
  });

  socket.on("transferCompleted", (senderId, receiverId, amount) => {
    if (userSocketMap[senderId]) {
      io.to(userSocketMap[senderId]).emit("transferNotification", {
        type: "sent",
        amount,
        receiverId,
      });
    }

    if (userSocketMap[receiverId]) {
      io.to(userSocketMap[receiverId]).emit("transferNotification", {
        type: "received",
        amount,
        senderId,
      });
    }

    io.emit("updateTransferHistory");
  });
});

export { io, app, server };
