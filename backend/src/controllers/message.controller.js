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
    // Extrair dados da requisição com tratamento de log detalhado
    console.log("Headers da requisição:", req.headers);
    console.log("Tamanho da requisição:", req.headers['content-length']);
    
    let { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("Recebendo mensagem com:", { 
      hasText: !!text, 
      hasImage: !!image, 
      hasFile: !!file,
      textLength: text ? text.length : 0,
      imageLength: image ? image.length : 0,
      fileInfo: file ? {
        name: file.name,
        type: file.type,
        size: file.size,
        dataLength: file.data ? file.data.length : 0
      } : null,
      receiverId 
    });

    // Validar entrada
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Conteúdo da mensagem é obrigatório" });
    }

    // Início: criar a mensagem sem arquivos primeiro
    const messageData = {
      senderId,
      receiverId,
      text: text || ""
    };

    // Preparar upload de imagem se presente
    let imageUrl = null;
    if (image) {
      try {
        console.log("Iniciando upload de imagem");
        const uploadResult = await uploadToCloudinary(image, "chat_images");
        imageUrl = uploadResult.url;
        messageData.image = imageUrl;
        console.log("Upload de imagem concluído:", imageUrl);
      } catch (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao processar imagem", 
          details: uploadError.message 
        });
      }
    }

    // Preparar upload de arquivo se presente
    let fileInfo = null;
    if (file && file.data) {
      try {
        console.log("Iniciando upload de arquivo:", file.name);
        
        // Determinar pasta apropriada
        const fileFolder = "chat_files";
        
        // Criar um nome de arquivo seguro
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const publicId = `${Date.now()}_${safeFileName}`;
        
        // Fazer upload para o Cloudinary
        const uploadResult = await uploadToCloudinary(file.data, fileFolder, {
          resource_type: "auto",
          public_id: publicId,
        });
        
        fileInfo = {
          name: file.name,
          type: file.type,
          size: file.size,
          url: uploadResult.url
        };
        
        messageData.file = fileInfo;
        console.log("Upload de arquivo concluído:", fileInfo);
      } catch (uploadError) {
        console.error("Erro detalhado ao fazer upload do arquivo:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao processar arquivo", 
          details: uploadError.message 
        });
      }
    }

    // Criar nova mensagem
    const newMessage = new Message(messageData);
    console.log("Salvando mensagem no banco de dados:", messageData);

    await newMessage.save();
    console.log("Mensagem salva com sucesso, ID:", newMessage._id);

    // Preparar mensagem de resposta
    const responseMessage = newMessage.toObject();

    // Enviar via socket se o receptor estiver online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error("ERRO CRÍTICO NO CONTROLADOR:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
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
    
    console.log("Solicitação para baixar arquivo da mensagem:", messageId);
    
    // Verificar se a mensagem existe
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log("Arquivo não encontrado: mensagem inexistente");
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Verificar se o usuário tem permissão (é o remetente ou o destinatário)
    if (message.senderId.toString() !== userId.toString() && 
        message.receiverId.toString() !== userId.toString()) {
      console.log("Acesso negado: usuário não tem permissão");
      return res.status(403).json({ error: "Sem permissão para acessar este arquivo" });
    }
    
    // Verificar se a mensagem contém um arquivo
    if (!message.file || !message.file.url) {
      console.log("Arquivo não encontrado na mensagem");
      return res.status(404).json({ error: "Esta mensagem não contém um arquivo" });
    }
    
    console.log("Redirecionando para URL do arquivo:", message.file.url);
    
    // Redirecionar para a URL do arquivo no Cloudinary
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