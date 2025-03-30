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
        });
      })
      .catch(err => console.error("Erro ao entrar em salas de grupo:", err));
  }

  // Evento de desconexão do Socket.IO
  socket.on("disconnect", () => {
    console.log("Um utilizador desconectou-se", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Eventos específicos para grupos
  socket.on("joinGroup", (groupId) => {
    socket.join(`group-${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group-${groupId}`);
  });
});

export { io, app, server };
