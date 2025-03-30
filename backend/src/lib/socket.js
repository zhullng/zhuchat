import { Server } from "socket.io"; // Importa a classe Server da biblioteca socket.io
import http from "http"; // Importa a biblioteca http para criar um servidor HTTP
import express from "express"; // Importa a biblioteca express para criar o servidor Express
import Group from "../models/group.model.js";

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

// Mapa para rastrear chamadas ativas
const activeCallsMap = {}; // Exemplo: {callId: {callerId, calleeId, callType}}

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

  // ===== EVENTOS DE CHAMADAS =====

  // Iniciar uma nova chamada
  socket.on("call:initiate", async (data, callback) => {
    const { targetUserId, callerId, callType, callId } = data;
    
    // Verificar se o usuário alvo está online
    const receiverSocketId = userSocketMap[targetUserId];
    
    if (!receiverSocketId) {
      callback({ success: false, message: "Usuário não está online" });
      return;
    }
    
    // Buscar informações do chamador para enviar para o receptor
    // Aqui você poderia buscar o nome do chamador do banco de dados
    // Para simplificar, estamos assumindo que isso seria feito no cliente
    
    // Registrar a chamada como ativa
    activeCallsMap[callId] = {
      callerId,
      calleeId: targetUserId,
      callType,
      status: 'ringing'
    };
    
    // Enviar evento de chamada recebida para o alvo
    io.to(receiverSocketId).emit("call:incoming", {
      callerId,
      callerName: "User", // Idealmente, buscar o nome do banco de dados
      callType,
      callId
    });
    
    callback({ success: true });
  });
  
  // Aceitar chamada
  socket.on("call:accept", (data, callback) => {
    const { callerId, calleeId, callId } = data;
    
    // Verificar se a chamada existe e está ativa
    if (!activeCallsMap[callId]) {
      callback({ success: false, message: "Chamada não encontrada" });
      return;
    }
    
    const callerSocketId = userSocketMap[callerId];
    
    if (!callerSocketId) {
      callback({ success: false, message: "Chamador desconectado" });
      return;
    }
    
    // Atualizar status da chamada
    activeCallsMap[callId].status = 'accepted';
    
    // Notificar o chamador que a chamada foi aceita
    io.to(callerSocketId).emit("call:accepted", {
      calleeId,
      callId
    });
    
    callback({ success: true });
  });
  
  // Rejeitar chamada
  socket.on("call:reject", (data) => {
    const { callerId, calleeId, callId } = data;
    
    if (!activeCallsMap[callId]) return;
    
    const callerSocketId = userSocketMap[callerId];
    
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:rejected", {
        calleeId,
        callId
      });
    }
    
    // Remover a chamada da lista de ativas
    delete activeCallsMap[callId];
  });
  
  // Sinalização WebRTC
  socket.on("call:signal", (data) => {
    const { signal, targetUserId, callId } = data;
    
    // Verificar se o alvo está online
    const targetSocketId = userSocketMap[targetUserId];
    
    if (!targetSocketId) return;
    
    // Repassar o sinal para o alvo
    io.to(targetSocketId).emit("call:signal", {
      signal,
      callId
    });
  });
  
  // Encerrar chamada
  socket.on("call:end", (data) => {
    const { userId, callId } = data;
    
    if (!activeCallsMap[callId]) return;
    
    const { callerId, calleeId } = activeCallsMap[callId];
    
    // Determinar o outro participante da chamada
    const otherUserId = userId === callerId ? calleeId : callerId;
    const otherUserSocketId = userSocketMap[otherUserId];
    
    // Notificar o outro participante
    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("call:ended", {
        callId
      });
    }
    
    // Remover a chamada da lista de ativas
    delete activeCallsMap[callId];
  });

  // ===== FIM DOS EVENTOS DE CHAMADAS =====

  // Evento de desconexão do Socket.IO
  socket.on("disconnect", () => {
    console.log("Um utilizador desconectou-se", socket.id);
    
    // Encerrar todas as chamadas ativas do usuário
    for (const callId in activeCallsMap) {
      const call = activeCallsMap[callId];
      
      if (call.callerId === userId || call.calleeId === userId) {
        // Determinar o outro participante
        const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;
        const otherUserSocketId = userSocketMap[otherUserId];
        
        // Notificar o outro participante
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("call:ended", {
            callId
          });
        }
        
        // Remover a chamada
        delete activeCallsMap[callId];
      }
    }
    
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