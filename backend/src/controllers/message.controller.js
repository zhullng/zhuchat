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
        { senderId: userToChatId, receiverId: myId },
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
    const { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validate input
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Conteúdo da mensagem é obrigatório" });
    }

    // Prepare image upload if present
    let imageUrl = null;
    if (image) {
      try {
        const uploadResult = await uploadToCloudinary(image, "chat_images");
        imageUrl = uploadResult.url;
      } catch (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao processar imagem", 
          details: uploadError.message 
        });
      }
    }

    // Prepare file upload if present
    let fileInfo = null;
    if (file && file.data) {
      try {
        const fileFolder = file.type.startsWith('image/') ? "chat_images" : "chat_files";
        const uploadResult = await uploadToCloudinary(file.data, fileFolder, {
          resource_type: "auto",
          public_id: `${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        });
        
        fileInfo = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: uploadResult.url
        };
      } catch (uploadError) {
        console.error("Erro ao fazer upload do arquivo:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao processar arquivo", 
          details: uploadError.message 
        });
      }
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
      file: fileInfo
    });

    await newMessage.save();

    // Prepare response message
    const responseMessage = {
      ...newMessage.toObject(),
      image: imageUrl,
      file: fileInfo
    };

    // Send via socket if receiver is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error("ERRO CRÍTICO NO CONTROLADOR:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message
    });
  }
};

export const getFileForMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;
    
    // Verificar se a mensagem existe e se o usuário tem permissão para acessá-la
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Verificar se o usuário tem permissão (é o remetente ou o destinatário)
    if (message.senderId.toString() !== userId.toString() && 
        message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sem permissão para acessar este arquivo" });
    }
    
    // Verificar se a mensagem contém um arquivo
    if (!message.file || !message.file.url) {
      return res.status(404).json({ error: "Esta mensagem não contém um arquivo" });
    }
    
    // Redirecionar para a URL do arquivo
    res.redirect(message.file.url);
  } catch (error) {
    console.error("Erro ao obter arquivo:", error);
    res.status(500).json({ error: "Erro ao obter arquivo" });
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
    
    // Verificar permissão de exclusão (apenas o remetente pode excluir)
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sem permissão para excluir esta mensagem" });
    }
    
    // Excluir mensagem do banco de dados
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
    // Log e tratamento de erro
    console.error("Erro ao excluir mensagem:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message 
    });
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