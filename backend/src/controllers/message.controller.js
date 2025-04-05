import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import gridFSService from "../lib/gridfs.service.js";

// Função auxiliar para calcular o tamanho do arquivo formatado
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
};

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
    console.log("Requisição recebida em /messages/send");
    
    const { text, image, file } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log("DIAGNÓSTICO COMPLETO DE ENTRADA:", {
      senderId,
      receiverId,
      hasText: !!text,
      hasImage: !!image,
      hasFile: !!file,
      fileDetails: file ? {
        name: file.name,
        type: file.type,
        size: file.size,
        dataLength: file.data ? `${file.data.substring(0, 50)}... (${file.data.length} bytes)` : 'N/A'
      } : null
    });

    // Validações de entrada
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Conteúdo da mensagem é obrigatório" });
    }

    // Lista de tipos de arquivo permitidos
    const allowedFileTypes = [
      'text/plain', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 
      'image/png', 
      'image/gif'
    ];

    // Criar a mensagem básica
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || ""
    });

    // Processar imagem (pequenas imagens podem ser armazenadas diretamente)
    if (image && image.startsWith('data:')) {
      console.log("Processando imagem");
      
      // Calcular tamanho aproximado da imagem base64
      const base64Size = Math.ceil((image.length * 3) / 4);
      
      // Se a imagem for grande, armazená-la no GridFS, caso contrário diretamente
      if (base64Size > 1024 * 1024) { // Maior que 1MB
        console.log("Imagem grande detectada, usando GridFS");
        try {
          const uploadResult = await gridFSService.uploadFile(
            image, 
            `image_${Date.now()}.jpg`, 
            { 
              messageId: newMessage._id.toString(),
              contentType: 'image/jpeg' 
            }
          );
          
          console.log("Upload de imagem concluído:", uploadResult);
          
          // Adicionar referência na mensagem
          newMessage.fileMetadata = {
            fileId: uploadResult.fileId,
            name: 'imagem.jpg',
            type: 'image/jpeg',
            size: formatFileSize(base64Size)
          };
        } catch (uploadError) {
          console.error("ERRO AO FAZER UPLOAD DA IMAGEM:", uploadError);
          return res.status(500).json({ 
            error: "Falha ao processar imagem grande", 
            details: uploadError.message 
          });
        }
      } else {
        // Imagem pequena, armazenar diretamente na mensagem
        newMessage.image = image;
      }
    }

    // Processar arquivo
    if (file && file.data && file.data.startsWith('data:')) {
      console.log("Processando arquivo");
      
      // Verificar se o tipo de arquivo é permitido
      if (!allowedFileTypes.includes(file.type)) {
        return res.status(400).json({ 
          error: "Tipo de arquivo não permitido", 
          allowedTypes: allowedFileTypes 
        });
      }

      // Validação da string base64
      if (!file.data.includes(',')) {
        return res.status(400).json({
          error: "Formato de dados base64 inválido",
          details: "A string não contém o delimitador de dados"
        });
      }
      
      try {
        console.log(`Iniciando upload de arquivo: ${file.name} (${file.type})`);
        
        // Fazer upload do arquivo para o GridFS
        const uploadResult = await gridFSService.uploadFile(
          file.data,
          file.name,
          {
            messageId: newMessage._id.toString(),
            contentType: file.type,
            originalSize: file.size
          }
        );
        
        console.log("Upload de arquivo concluído:", uploadResult);
        
        // Adicionar referência do arquivo na mensagem
        newMessage.fileMetadata = {
          fileId: uploadResult.fileId,
          name: file.name,
          type: file.type,
          size: file.size
        };
      } catch (uploadError) {
        console.error("ERRO AO FAZER UPLOAD DO ARQUIVO:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao fazer upload do arquivo", 
          details: uploadError.message 
        });
      }
    }

    // Salvar a mensagem no banco de dados
    await newMessage.save();
    console.log("Mensagem salva com sucesso:", newMessage._id);

    // Criar versão da mensagem para envio via socket e resposta HTTP
    const responseMessage = {
      ...newMessage.toObject(),
      // Não enviar o conteúdo binário por socket ou HTTP
      file: newMessage.fileMetadata ? {
        fileId: newMessage.fileMetadata.fileId.toString(),
        name: newMessage.fileMetadata.name,
        type: newMessage.fileMetadata.type,
        size: newMessage.fileMetadata.size
      } : null
    };

    // Enviar via socket se destinatário estiver online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", responseMessage);
    }

    // Responder com a mensagem criada
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

// Endpoint para obter um arquivo específico de uma mensagem
export const getFile = async (req, res) => {
  try {
    const { id: fileId } = req.params;
    console.log(`Requisição para download do arquivo: ${fileId}`);
    
    try {
      // Buscar o arquivo no GridFS
      const fileData = await gridFSService.downloadFile(fileId);
      
      // Configurar headers para download
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
      res.setHeader('Content-Type', fileData.contentType || 'application/octet-stream');
      
      // Enviar o buffer do arquivo
      res.send(fileData.buffer);
      console.log(`Arquivo ${fileId} enviado com sucesso`);
    } catch (downloadError) {
      console.error(`Erro ao baixar arquivo ${fileId}:`, downloadError);
      res.status(404).json({ error: "Arquivo não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao obter arquivo:", error);
    res.status(500).json({ error: "Erro ao obter arquivo" });
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
        // Criar versão leve da mensagem
        const lightMessage = {
          ...message.toObject(),
          // Manter apenas metadados do arquivo, não o conteúdo
          fileMetadata: message.fileMetadata ? {
            fileId: message.fileMetadata.fileId,
            name: message.fileMetadata.name,
            type: message.fileMetadata.type,
            size: message.fileMetadata.size
          } : null
        };
        
        conversationsMap[otherUserId] = {
          participants: [userId.toString(), otherUserId],
          latestMessage: lightMessage,
          unreadCount: (message.receiverId.toString() === userId.toString() && !message.read) ? 1 : 0
        };
      } else {
        // Verifica se esta mensagem é mais recente que a atual
        const currentTimestamp = new Date(conversationsMap[otherUserId].latestMessage.createdAt).getTime();
        const newTimestamp = new Date(message.createdAt).getTime();
        
        if (newTimestamp > currentTimestamp) {
          // Criar versão leve da mensagem
          const lightMessage = {
            ...message.toObject(),
            // Manter apenas metadados do arquivo, não o conteúdo
            fileMetadata: message.fileMetadata ? {
              fileId: message.fileMetadata.fileId,
              name: message.fileMetadata.name,
              type: message.fileMetadata.type,
              size: message.fileMetadata.size
            } : null
          };
          
          conversationsMap[otherUserId].latestMessage = lightMessage;
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

// Função para excluir uma mensagem (incluindo arquivos do GridFS)
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
    
    // Se a mensagem contém um arquivo no GridFS, excluí-lo
    if (message.fileMetadata && message.fileMetadata.fileId) {
      try {
        await gridFSService.deleteFile(message.fileMetadata.fileId);
        console.log(`Arquivo ${message.fileMetadata.fileId} excluído do GridFS`);
      } catch (deleteError) {
        console.error(`Erro ao excluir arquivo ${message.fileMetadata.fileId}:`, deleteError);
        // Continuar mesmo com erro na exclusão do arquivo
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