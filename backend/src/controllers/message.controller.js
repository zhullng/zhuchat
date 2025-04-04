import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary, { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary.js";
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

// Função para enviar mensagens com suporte a qualquer tipo e tamanho de ficheiro
export const sendMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Log detalhado de entrada
    console.log("DETALHES COMPLETOS DA REQUISIÇÃO:", {
      senderId,
      receiverId,
      hasText: !!text,
      hasImage: !!image,
      hasFile: !!file,
      fileDetails: file ? {
        name: file.name,
        type: file.type,
        size: file.size,
        dataLength: file.data ? file.data.length : 'N/A',
        dataPrefix: file.data ? file.data.substring(0, 50) : 'N/A'
      } : null
    });

    // Validações rigorosas de entrada
    if (!text && !image && !file) {
      console.error("ERRO: Conteúdo da mensagem é obrigatório");
      return res.status(400).json({ 
        error: "Conteúdo da mensagem é obrigatório",
        details: "Sem texto, imagem ou arquivo" 
      });
    }

    let imageUrl = null;
    let fileData = null;

    // Upload de imagem
    if (image && image.startsWith('data:')) {
      try {
        console.log("Iniciando upload de imagem...");
        const uploadResult = await uploadToCloudinary(image, "chat_images");
        imageUrl = uploadResult.url;
        console.log("Upload de imagem concluído:", imageUrl);
      } catch (uploadError) {
        console.error("ERRO FATAL no upload de imagem:", uploadError);
        return res.status(500).json({ 
          error: "Falha no upload da imagem", 
          details: uploadError.message 
        });
      }
    }

    // Upload de arquivo
    if (file && file.data) {
      try {
        // Validações adicionais de segurança
        if (!file.data.startsWith('data:')) {
          console.error("ERRO: Formato de dados do arquivo inválido");
          return res.status(400).json({ 
            error: "Formato de dados do arquivo inválido",
            details: "Dados do arquivo não começam com 'data:'" 
          });
        }

        // Verificação de tamanho e conteúdo
        const dataLength = file.data.length;
        const fileSize = parseInt(file.size || '0');

        console.log("DETALHES DO ARQUIVO:", {
          name: file.name,
          type: file.type,
          dataLength,
          fileSize
        });

        // Verificações de segurança
        if (dataLength <= 0 || fileSize === 0) {
          console.error("ERRO: Arquivo vazio ou inválido");
          return res.status(400).json({ 
            error: "Arquivo inválido ou vazio",
            details: { dataLength, fileSize }
          });
        }

        // Verificação de tipo de arquivo
        const allowedTypes = [
          'text/plain', 
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg', 
          'image/png', 
          'image/gif'
        ];

        if (!allowedTypes.includes(file.type)) {
          console.error("ERRO: Tipo de arquivo não permitido");
          return res.status(400).json({ 
            error: "Tipo de arquivo não permitido",
            details: { fileType: file.type }
          });
        }

        console.log("Iniciando upload de ficheiro...");
        const uploadResult = await uploadToCloudinary(file.data, "chat_files");
        
        fileData = {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          type: file.type || "application/octet-stream",
          name: file.name || "ficheiro",
          size: file.size || ""
        };
        console.log("Upload de ficheiro concluído:", fileData.url);
      } catch (uploadError) {
        console.error("ERRO FATAL no upload de ficheiro:", uploadError);
        return res.status(500).json({ 
          error: "Falha no upload do ficheiro", 
          details: uploadError.message 
        });
      }
    }

    // Criar e salvar mensagem
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
      file: fileData
    });

    await newMessage.save();
    console.log("Mensagem salva com sucesso:", newMessage._id);

    // Enviar via socket se destinatário estiver online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("ERRO CRÍTICO no envio de mensagem:", {
      message: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message,
      stack: error.stack 
    });
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

// Função para excluir uma mensagem (incluindo ficheiros do Cloudinary)
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
    
    // Se a mensagem contém uma imagem, excluí-la do Cloudinary
    if (message.image) {
      try {
        // Extrair o public_id da URL
        const urlParts = message.image.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        
        if (publicId && folder) {
          await deleteFromCloudinary(`${folder}/${publicId}`);
        }
      } catch (cloudinaryError) {
        console.error("Erro ao excluir imagem do Cloudinary:", cloudinaryError);
        // Continuar com a exclusão da mensagem mesmo se a exclusão do Cloudinary falhar
      }
    }
    
    // Se a mensagem contém um ficheiro, excluí-lo do Cloudinary
    if (message.file && message.file.public_id) {
      try {
        await deleteFromCloudinary(message.file.public_id);
      } catch (cloudinaryError) {
        console.error("Erro ao excluir ficheiro do Cloudinary:", cloudinaryError);
        // Continuar com a exclusão da mensagem mesmo se a exclusão do Cloudinary falhar
      }
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