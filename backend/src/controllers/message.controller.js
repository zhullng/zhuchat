import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary, { uploadToCloudinary } from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// Função para obter os users a mostrar na barra lateral
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id; // Recebe o ID do user com login
    // Filtra todos, exceto o user com login -> $ne 'não seja igual'
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers); // Retorna os users filtrados
  } catch (error) {
    console.error("Erro em getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para obter as mensagens entre o user com login e outro user
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params; // ID do user com quem se quer conversar
    const myId = req.user._id; // ID do user

    // Obtém as mensagens
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // Ordenar por data de criação ascendente

    res.status(200).json(messages); 
  } catch (error) {
    console.log("Erro no controlador de getMessages: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para enviar uma mensagem
export const sendMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body; // Texto, imagem e arquivo da mensagem
    const { id: receiverId } = req.params; // ID do user destinatário
    const senderId = req.user._id; // ID do user remetente

    let imageUrl;
    let fileData = null;

    // Upload de imagem, se fornecida (e não for já uma URL)
    if (image) {
      if (image.startsWith('data:')) {
        // É um base64, precisa fazer upload
        try {
          const uploadResult = await uploadToCloudinary(image, "chat_images");
          imageUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("Erro no upload de imagem:", uploadError);
          return res.status(500).json({ error: "Falha no upload da imagem" });
        }
      } else if (image.startsWith('http')) {
        // Já é uma URL, provavelmente já foi feito upload diretamente
        imageUrl = image;
      }
    }

    // Processar dados do arquivo, se fornecido
    if (file) {
      // Se o arquivo já tiver uma URL (upload direto do cliente para o Cloudinary)
      if (file.url && file.url.startsWith('http')) {
        fileData = {
          url: file.url,
          type: file.type || "application/octet-stream",
          name: file.name || "arquivo"
        };
      } 
      // Se for dados base64, fazer upload
      else if (file.data && file.data.startsWith('data:')) {
        try {
          const uploadResult = await uploadToCloudinary(file.data, "chat_files");
          fileData = {
            url: uploadResult.url,
            type: file.type || "application/octet-stream",
            name: file.name || "arquivo"
          };
        } catch (uploadError) {
          console.error("Erro no upload de arquivo:", uploadError);
          return res.status(500).json({ error: "Falha no upload do arquivo" });
        }
      }
    }

    // Cria um novo objeto de mensagem com suporte a arquivos
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileData
    });

    // Guarda a nova mensagem na base de dados
    await newMessage.save();

    // Obtém o socketId do user destinatário
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      // Se o user destinatário estiver online, envia a mensagem para ele
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Erro no controlador de sendMessage: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para obter todas as conversas do utilizador atual
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Encontra todas as mensagens onde o utilizador atual é remetente ou destinatário
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ createdAt: -1 }); // Ordenação por mais recentes primeiro
    
    // Criar um mapa para armazenar a mensagem mais recente para cada conversa
    const conversationsMap = {};
    
    // Processar as mensagens para criar um objeto de conversas
    messages.forEach(message => {
      // Determinar quem é o outro participante da conversa
      const otherUserId = message.senderId.toString() === userId.toString() 
        ? message.receiverId.toString() 
        : message.senderId.toString();
      
      // Se ainda não vimos esta conversa, adicionar ao mapa
      if (!conversationsMap[otherUserId]) {
        conversationsMap[otherUserId] = {
          participants: [userId.toString(), otherUserId],
          latestMessage: message,
          unreadCount: (message.receiverId.toString() === userId.toString() && !message.read) ? 1 : 0
        };
      } else {
        // Verifica se esta mensagem é mais recente que a atual
        const currentTimestamp = new Date(conversationsMap[otherUserId].latestMessage.createdAt).getTime();
        const newTimestamp = new Date(message.createdAt).getTime();
        
        if (newTimestamp > currentTimestamp) {
          conversationsMap[otherUserId].latestMessage = message;
        }
        
        // Incrementar contador de não lidas se aplicável
        if (message.receiverId.toString() === userId.toString() && !message.read) {
          conversationsMap[otherUserId].unreadCount = 
            (conversationsMap[otherUserId].unreadCount || 0) + 1;
        }
      }
    });
    
    // Converter o mapa em array
    const conversations = Object.values(conversationsMap);
    
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Erro em getConversations:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para excluir uma mensagem
export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params; // ID da mensagem a ser excluída
    const userId = req.user._id; // ID do usuário que está fazendo a solicitação
    
    // Buscar a mensagem para verificar se o usuário tem permissão para excluí-la
    const message = await Message.findById(messageId);
    
    // Verificar se a mensagem existe
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }
    
    // Verificar se o usuário é o remetente da mensagem (apenas remetentes podem excluir)
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sem permissão para excluir esta mensagem" });
    }
    
    // Excluir a mensagem
    await Message.findByIdAndDelete(messageId);
    
    // Notificar o outro usuário sobre a exclusão via socket, se estiver online
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }
    
    res.status(200).json({ success: true, message: "Mensagem excluída com sucesso" });
  } catch (error) {
    console.error("Erro em deleteMessage:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para marcar uma conversa como lida
export const markConversationAsRead = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const userId = req.user._id;
    
    // Encontrar e atualizar todas as mensagens não lidas do outro utilizador para o utilizador atual
    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        read: false
      },
      {
        $set: { read: true }
      }
    );
    
    res.status(200).json({ 
      success: true, 
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error("Erro em markConversationAsRead:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};