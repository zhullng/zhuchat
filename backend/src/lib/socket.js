import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:5173"],
    credentials: true
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
  pingTimeout: 300000, // 5 minutes
  transports: ["websocket", "polling"],
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      level: 6,
      memLevel: 8
    }
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Maps to track online users and socket rooms
const userSocketMap = {}; // {userId: socketId}

// Function to get socket ID for a user
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId) {
    // Store user's socket ID
    userSocketMap[userId] = socket.id;

    // Emit online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Automatically join group rooms for the user
    try {
      Group.find({ members: userId })
        .then(groups => {
          groups.forEach(group => {
            const roomName = `group-${group._id}`;
            socket.join(roomName);
            console.log(`User ${userId} joined group room: ${roomName}`);
          });
        })
        .catch(err => {
          console.error("Error joining group rooms:", err);
        });
    } catch (error) {
      console.error("Unexpected error in group room joining:", error);
    }
  }

  // Typing indicators
  socket.on("typing", (data) => {
    if (data.to) {
      const receiverSocketId = userSocketMap[data.to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { from: data.from || userId });
      }
    }
  });

  socket.on("stopTyping", (data) => {
    if (data.to) {
      const receiverSocketId = userSocketMap[data.to];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { from: data.from || userId });
      }
    }
  });

  // Manual group room management
  socket.on("joinGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.join(roomName);
    console.log(`User ${userId} manually joined group room: ${roomName}`);
  });

  socket.on("leaveGroup", (groupId) => {
    const roomName = `group-${groupId}`;
    socket.leave(roomName);
    console.log(`User ${userId} manually left group room: ${roomName}`);
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove user from socket map
    for (const [key, value] of Object.entries(userSocketMap)) {
      if (value === socket.id) {
        delete userSocketMap[key];
        break;
      }
    }
    
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };