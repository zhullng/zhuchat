import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { uploadToCloudinary } from "../lib/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Erro em getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId,receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages); 
  } catch (error) {
    console.log("Erro no controlador de getMessages: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    // Extrair dados da requisição
    const { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validar entrada
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Conteúdo da mensagem é obrigatório" });
    }

    // Criar objeto da mensagem
    const messageData = {
      senderId,
      receiverId,
      text: text || ""
    };

    // Processar imagem (se houver) - usando Cloudinary para imagens normais
    if (image) {
      try {
        const uploadResult = await uploadToCloudinary(image, "chat_images");
        messageData.image = uploadResult.url;
      } catch (error) {
        console.error("Erro ao fazer upload da imagem:", error);
        return res.status(500).json({ error: "Falha ao processar imagem" });
      }
    }

    // Processar arquivo (se houver) - armazenando diretamente como JSON
    if (file) {
      // Armazenar informações do arquivo com dados base64 diretamente
      const fileInfo = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: file.data // Dados base64 do arquivo
      };
      
      // Converter para JSON e armazenar
      messageData.fileData = JSON.stringify(fileInfo);
    }

    // Criar e Guardar a mensagem
    const newMessage = new Message(messageData);
    await newMessage.save();

    // Preparar mensagem de resposta
    const responseMessage = newMessage.toObject();

    // Enviar via socket se o receptor estiver online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    // Resposta de sucesso
    res.status(201).json(responseMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    }).sort({ createdAt: -1 });
    
    const conversationsMap = {};
    
    messages.forEach(message => {
      const otherUserId = message.senderId.toString() === userId.toString() 
        ? message.receiverId.toString() 
        : message.senderId.toString();
      
      if (!conversationsMap[otherUserId]) {
        const lightMessage = {
          ...message.toObject(),
        };
        
        conversationsMap[otherUserId] = {
          participants: [userId.toString(), otherUserId],
          latestMessage: lightMessage,
          unreadCount: (message.receiverId.toString() === userId.toString() && !message.read) ? 1 : 0
        };
      } else {
        const currentTimestamp = new Date(conversationsMap[otherUserId].latestMessage.createdAt).getTime();
        const newTimestamp = new Date(message.createdAt).getTime();
        
        if (newTimestamp > currentTimestamp) {
          const lightMessage = {
            ...message.toObject(),
          };
          
          conversationsMap[otherUserId].latestMessage = lightMessage;
        }
        
        if (message.receiverId.toString() === userId.toString() && !message.read) {
          conversationsMap[otherUserId].unreadCount = 
            (conversationsMap[otherUserId].unreadCount || 0) + 1;
        }
      }
    });
    
    const conversations = Object.values(conversationsMap);
    
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Erro em getConversations:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;
    
    // Encontrar a mensagem
    const message = await Message.findById(messageId);
    
    // Verificar se a mensagem existe
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }
    
    // Verificar permissão de exclusão (apenas o remetente pode Eliminar)
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sem permissão para Eliminar esta mensagem" });
    }
    
    // Eliminar mensagem do banco de dados
    await Message.findByIdAndDelete(messageId);
    
    // Notificar o destinatário via WebSocket se estiver online
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }
    
    // Resposta de sucesso
    res.status(200).json({ 
      success: true, 
      message: "Mensagem excluída com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao Eliminar mensagem:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const userId = req.user._id;
    
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