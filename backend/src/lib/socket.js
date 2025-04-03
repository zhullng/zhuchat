import { Server } from "socket.io";
import http from "http";
import express from "express";
import Group from "../models/group.model.js";
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Cria a aplicação Express
const app = express();

// Cria o servidor HTTP a partir da aplicação Express
const server = http.createServer(app);

// Configuração aprimorada do Socket.IO para suportar arquivos grandes
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? 
      [process.env.FRONTEND_URL || "http://localhost:5173", "*"] : 
      ["http://localhost:5173", "*"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  // Aumentar buffer máximo para mensagens grandes
  maxHttpBufferSize: 20e6, // 20MB (era 1MB por padrão)
  
  // Aumentar timeouts para evitar desconexões durante operações longas
  pingTimeout: 60000, // 60 segundos (era 20s por padrão)
  pingInterval: 25000, // 25 segundos (era 25s por padrão)
  
  // Configurar transportes para melhor desempenho
  transports: ['websocket', 'polling'],
  
  // Tempo máximo para conexão
  connectTimeout: 45000, // 45 segundos
  
  // Configurações de reconexão
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

// Função que retorna o Socket ID do recetor dado o userId
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]; 
}

// Mapa para armazenar os users online
const userSocketMap = {}; // Exemplo: {userId: socketId}

io.on("connection", (socket) => {
  console.log("Um utilizador conectou-se", socket.id); 

  // Configurar socket individual para suportar arquivos grandes
  socket.conn.maxHttpBufferSize = 20e6; // 20MB por socket
  socket.setMaxListeners(20); // Aumentar máximo de listeners

  // Obtém o userId a partir dos dados da handshake
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    
    // Entrar na sala específica do usuário para mensagens diretas
    socket.join(userId);
    
    // Informar que o usuário está online
    socket.broadcast.emit("userOnline", userId);
  }

  // Emite um evento para todos os users conectados
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Juntar-se a salas de grupo
  if (userId) {
    // Buscar grupos do usuário e entrar nas salas correspondentes
    Group.find({ members: userId })
      .then(groups => {
        groups.forEach(group => {
          socket.join(`group-${group._id}`);
          console.log(`Usuário ${userId} entrou no grupo ${group._id}`);
        });
      })
      .catch(err => console.error("Erro ao entrar em salas de grupo:", err));
  }

  // Evento de desconexão do Socket.IO com tratamento melhorado
  socket.on("disconnect", (reason) => {
    console.log(`Um utilizador desconectou-se (${reason})`, socket.id);
    
    if (userId) {
      delete userSocketMap[userId];
      
      // Informar que o usuário está offline
      socket.broadcast.emit("userOffline", userId);
      
      // Atualizar lista de usuários online
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  // Eventos específicos para grupos
  socket.on("joinGroup", (groupId) => {
    socket.join(`group-${groupId}`);
    console.log(`Usuário ${userId} entrou manualmente no grupo ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group-${groupId}`);
    console.log(`Usuário ${userId} saiu manualmente do grupo ${groupId}`);
  });
  
  // Tratamento de erro aprimorado
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    
    // Não desconectar em caso de erro de largura de banda, tentar recuperar
    if (error.message && (error.message.includes('transport') || error.message.includes('timeout'))) {
      // Tentar pausar e retomar o transporte
      if (socket.conn && socket.conn.transport) {
        socket.conn.transport.pause();
        setTimeout(() => {
          if (socket.conn && socket.conn.transport) {
            socket.conn.transport.resume();
          }
        }, 5000); // Pausar e retomar após 5 segundos
      }
    }
  });
  
  // Evento específico para indicar progresso de upload
  socket.on("uploadProgress", (data) => {
    // Repassar evento de progresso para o destinatário
    const receiverSocketId = userSocketMap[data.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("uploadProgress", {
        senderId: userId,
        progress: data.progress,
        fileName: data.fileName
      });
    }
  });
});

// Configurar tratamento de erros no nível do servidor Socket.IO
io.engine.on("connection_error", (err) => {
  console.error("Erro de conexão no Socket.IO:", err);
});

export { io, app, server };