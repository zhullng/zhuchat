import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
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
    const { id: chatId } = req.params; // ID do user ou grupo com quem se quer conversar
    const myId = req.user._id; // ID do user

    // Obtém as mensagens (para usuários ou grupos)
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: chatId },
        { senderId: chatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages); 
  } catch (error) {
    console.log("Erro no controlador de getMessages: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função para enviar uma mensagem
export const sendMessage = async (req, res) => {
  try {
    const { text, image, receiverType } = req.body; // Texto, imagem e tipo de destinatário
    const { id: receiverId } = req.params; // ID do destinatário (usuário ou grupo)
    const senderId = req.user._id; // ID do remetente

    let imageUrl;
    if (image) {
      // Se a mensagem contém uma imagem, faz o upload para o Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url; // Obtém a URL segura da imagem
    }

    // Cria um novo objeto de mensagem
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      receiverType, // Agora o receiverType é "user" ou "group"
    });

    // Guarda a nova mensagem na bd
    await newMessage.save();

    if (receiverType === "user") {
      // Se for para um usuário, envia a mensagem apenas para o destinatário
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
    } else if (receiverType === "group") {
      // Se for para um grupo, envia para todos os participantes
      // Supondo que você tenha um modelo de Grupo e ele tem um campo "participants"
      const group = await Group.findById(receiverId);
      if (group && group.participants) {
        group.participants.forEach(async (participantId) => {
          const participantSocketId = getReceiverSocketId(participantId.toString());
          if (participantSocketId) {
            io.to(participantSocketId).emit("newMessage", newMessage);
          }
        });
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Erro no controlador de sendMessage: ", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
