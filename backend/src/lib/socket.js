import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173"] },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {}; 

io.on("connection", (socket) => {
  console.log("Um utilizador conectou-se", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("Um utilizador desconectou-se", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("transferCompleted", (senderId, receiverId, amount, updatedSenderBalance, updatedReceiverBalance) => {
    const senderSocketId = userSocketMap[senderId];
    const receiverSocketId = userSocketMap[receiverId];

    if (senderSocketId) {
      io.to(senderSocketId).emit("balanceUpdated", updatedSenderBalance);
      io.to(senderSocketId).emit("transferNotification", { type: "sent", amount, receiverId });
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("balanceUpdated", updatedReceiverBalance);
      io.to(receiverSocketId).emit("transferNotification", { type: "received", amount, senderId });
    }

    io.emit("updateTransferHistory");
  });
});

export { io, app, server };
