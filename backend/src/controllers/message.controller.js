import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../lib/cloudinary.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Configure directory paths for file storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

    // Validate input - at least one of text, image, or file must be present
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Conteúdo da mensagem é obrigatório" });
    }

    // Prepare message object
    const messageData = {
      senderId,
      receiverId,
      text: text || ""
    };

    // Handle image upload if present
    if (image) {
      try {
        const uploadResult = await uploadToCloudinary(image, "chat_images");
        messageData.image = uploadResult.url;
      } catch (uploadError) {
        console.error("Erro ao fazer upload da imagem:", uploadError);
        return res.status(500).json({ 
          error: "Falha ao processar imagem", 
          details: uploadError.message 
        });
      }
    }

    // Handle file upload if present
    if (file) {
      try {
        // Extract file data and info
        const { data, name, type, size } = file;
        
        // Generate a unique filename for storage
        const uniqueId = uuidv4();
        const sanitizedFilename = name.replace(/[^a-zA-Z0-9.]/g, '_');
        const storedFilename = `${uniqueId}-${sanitizedFilename}`;
        const filePath = path.join(uploadsDir, storedFilename);
        
        // Save the file data
        const base64Data = data.split(';base64,').pop();
        fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
        
        // Add file information to message
        messageData.file = {
          name,
          type,
          size,
          path: storedFilename // Store only the filename, not the full path
        };
      } catch (fileError) {
        console.error("Erro ao processar arquivo:", fileError);
        return res.status(500).json({ 
          error: "Falha ao processar arquivo", 
          details: fileError.message 
        });
      }
    }

    // Create and save new message
    const newMessage = new Message(messageData);
    await newMessage.save();

    // Send via socket if receiver is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
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

// Get file for a message
export const getMessageFile = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    
    // Find message by ID
    const message = await Message.findById(messageId);
    
    if (!message || !message.file || !message.file.path) {
      return res.status(404).json({ error: "Arquivo não encontrado" });
    }
    
    // Construct full file path
    const filePath = path.join(uploadsDir, message.file.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Arquivo não encontrado no servidor" });
    }
    
    // Set appropriate content type if known
    if (message.file.type) {
      res.setHeader('Content-Type', message.file.type);
    }
    
    // Set content disposition to suggest filename for download
    res.setHeader('Content-Disposition', `attachment; filename="${message.file.name}"`);
    
    // Send the file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Erro ao obter arquivo:", error);
    res.status(500).json({ error: "Erro ao obter arquivo" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }
    
    // Check delete permission (only sender can delete)
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Sem permissão para excluir esta mensagem" });
    }
    
    // Delete associated file if exists
    if (message.file && message.file.path) {
      try {
        const filePath = path.join(uploadsDir, message.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error("Erro ao excluir arquivo:", fileError);
        // Continue with message deletion even if file deletion fails
      }
    }
    
    // Delete associated image from Cloudinary if exists
    if (message.image) {
      try {
        // Extract public ID from URL
        const publicId = message.image.split('/').pop().split('.')[0];
        await deleteFromCloudinary(publicId);
      } catch (imageError) {
        console.error("Erro ao excluir imagem do Cloudinary:", imageError);
        // Continue with message deletion even if image deletion fails
      }
    }
    
    // Delete message from database
    await Message.findByIdAndDelete(messageId);
    
    // Notify receiver via WebSocket if online
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Mensagem excluída com sucesso" 
    });
  } catch (error) {
    console.error("Erro ao excluir mensagem:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message 
    });
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
        conversationsMap[otherUserId] = {
          participants: [userId.toString(), otherUserId],
          latestMessage: message,
          unreadCount: (message.receiverId.toString() === userId.toString() && !message.read) ? 1 : 0
        };
      } else {
        const currentTimestamp = new Date(conversationsMap[otherUserId].latestMessage.createdAt).getTime();
        const newTimestamp = new Date(message.createdAt).getTime();
        
        if (newTimestamp > currentTimestamp) {
          conversationsMap[otherUserId].latestMessage = message;
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