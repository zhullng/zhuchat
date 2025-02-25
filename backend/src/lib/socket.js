import { Server } from "socket.io"; // Importa a classe Server da biblioteca socket.io
import http from "http"; // Importa a biblioteca http para criar um servidor HTTP
import express from "express"; // Importa a biblioteca express para criar o servidor Express

// Cria a aplicação Express
const app = express();

// Cria o servidor HTTP a partir da aplicação Express
const server = http.createServer(app);

// Cria uma instância do Server do Socket.IO, associada ao servidor HTTP
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"], // Permite conexões do domínio especificado (origem permitida)
  },
});

// Função que retorna o Socket ID do recetor dado o userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

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
});

export { io, app, server };
