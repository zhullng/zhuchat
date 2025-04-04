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
    origin: process.env.CLIENT_URL || ["http://localhost:5173"],
    credentials: true
  },
  // Aumentar o tamanho máximo do pacote para suportar ficheiros grandes
  maxHttpBufferSize: 100 * 1024 * 1024, // 100MB
  // Aumentar o timeout para evitar desconexões durante uploads grandes
  pingTimeout: 300000, // 5 minutos
  // Priorizar WebSocket para melhor desempenho
  transports: ["websocket", "polling"],
  // Configurações adicionais para otimização
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
        });
      })
      .catch(err => console.error("Erro ao entrar em salas de grupo:", err));
  }

  // ====== INÍCIO: EVENTOS RELACIONADOS À CARTEIRA ======

  // Evento para transferência de fundos
  socket.on("wallet_transfer", async (data) => {
    console.log("Evento de transferência recebido:", data);
    
    try {
      let receiverId = null;
      
      // Transferência por email
      if (data.type === 'email' && data.receiverEmail) {
        // Aqui você precisa buscar o userId associado ao email
        // Pseudocódigo: você precisará implementar essa função
        receiverId = await getUserIdByEmail(data.receiverEmail);
      }
      // Transferência por QR code
      else if (data.type === 'qr' && data.qrData) {
        // Extrair o userId dos dados do QR
        // Pseudocódigo: você precisará implementar essa função
        receiverId = extractUserIdFromQR(data.qrData);
      }
      
      if (receiverId) {
        // Se o receptor estiver online, notificá-lo
        const receiverSocketId = userSocketMap[receiverId];
        
        if (receiverSocketId) {
          // Buscar informações do remetente (opcional)
          // Você pode precisar buscar essas informações do seu banco de dados
          const senderName = userId; // Substitua por lógica que busca o nome do usuário
          
          // Enviar notificação para o receptor
          io.to(receiverSocketId).emit("wallet_updated", {
            type: "transfer_received",
            amount: data.amount,
            senderName: senderName,
            transferId: data.transferId || null,
            timestamp: new Date().toISOString()
          });
          
          console.log(`Notificação de transferência enviada para usuário: ${receiverId}`);
        } else {
          console.log(`Receptor ${receiverId} não está online para receber notificação`);
        }
      }
    } catch (error) {
      console.error("Erro ao processar transferência de carteira:", error);
    }
  });

  // ====== FIM: EVENTOS RELACIONADOS À CARTEIRA ======

  // Evento específico para confirmação de recebimento de mensagem
  socket.on("messageReceived", (messageId) => {
    console.log(`Mensagem recebida e confirmada: ${messageId}`);
  });

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
    socket.join(`group-${groupId}`);
    console.log(`Usuário ${userId} entrou no grupo ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(`group-${groupId}`);
    console.log(`Usuário ${userId} saiu do grupo ${groupId}`);
  });
});

// Funções auxiliares para o processamento de transferências
// Estas são funções de esboço que você precisará implementar com seu modelo de dados

// Função para obter um userId a partir de um email
async function getUserIdByEmail(email) {
  try {
    // Implemente isso de acordo com seu modelo de dados
    // Exemplo:
    // const user = await User.findOne({ email: email });
    // return user ? user._id.toString() : null;
    
    // Temporariamente retornando null até você implementar
    return null;
  } catch (error) {
    console.error("Erro ao buscar usuário por e-mail:", error);
    return null;
  }
}

// Função para extrair o userId dos dados do QR
function extractUserIdFromQR(qrData) {
  try {
    // Implemente isso com base no formato do seu QR code
    // Exemplo: 
    // const decodedData = JSON.parse(qrData);
    // return decodedData.userId;
    
    // Temporariamente retornando null até você implementar
    return null;
  } catch (error) {
    console.error("Erro ao extrair userId do QR code:", error);
    return null;
  }
}

export { io, app, server };