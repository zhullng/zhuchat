// controllers/group.controller.js
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

// Criar um novo grupo
export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const createdBy = req.user._id;
    
    // Imagem do grupo, se fornecida
    let profilePic = "";
    if (req.body.profilePic && req.body.profilePic.startsWith('data:')) {
      const uploadResponse = await cloudinary.uploader.upload(req.body.profilePic, {
        resource_type: "auto"
      });
      profilePic = uploadResponse.secure_url;
    }
    
    // Garantir que o criador também é um membro
    if (!members.includes(createdBy.toString())) {
      members.push(createdBy);
    }
    
    const newGroup = new Group({
      name,
      description,
      createdBy,
      members,
      profilePic
    });
    
    await newGroup.save();
    
    // Notificar membros sobre o novo grupo via socket
    members.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroup", newGroup);
      }
    });
    
    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Erro ao criar grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Obter todos os grupos do usuário
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Encontrar grupos onde o usuário é membro
    const groups = await Group.find({ 
      members: { $in: [userId] } 
    }).populate("members", "fullName profilePic email");
    
    res.status(200).json(groups);
  } catch (error) {
    console.error("Erro ao obter grupos:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Obter detalhes de um grupo específico
export const getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    
    // Verificar se o usuário é membro do grupo
    const group = await Group.findOne({
      _id: groupId,
      members: { $in: [userId] }
    }).populate("members", "fullName profilePic email");
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado ou acesso negado" });
    }
    
    res.status(200).json(group);
  } catch (error) {
    console.error("Erro ao obter detalhes do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Enviar mensagem para um grupo
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { id: groupId } = req.params;
    const senderId = req.user._id;
    
    // Verificar se o usuário é membro do grupo
    const group = await Group.findOne({
      _id: groupId,
      members: { $in: [senderId] }
    });
    
    if (!group) {
      return res.status(403).json({ error: "Você não é membro deste grupo" });
    }
    
    let imageUrl;
    let fileData = null;
    
    // Upload de imagem, se fornecida
    if (image && image.startsWith('data:')) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "auto",
        chunk_size: 6000000,
        timeout: 120000
      });
      imageUrl = uploadResponse.secure_url;
    }
    
    // Upload de arquivo, se fornecido
    if (file && file.data && file.data.startsWith('data:')) {
      const uploadResponse = await cloudinary.uploader.upload(file.data, {
        resource_type: "auto",
        public_id: `group_chat_files/${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        chunk_size: 6000000,
        timeout: 150000
      });
      
      fileData = {
        url: uploadResponse.secure_url,
        type: file.type || "application/octet-stream",
        name: file.name || "arquivo"
      };
    }
    
    // Criar a mensagem
    const newMessage = new GroupMessage({
      groupId,
      senderId,
      text,
      image: imageUrl,
      file: fileData,
      read: [{ userId: senderId }] // O remetente já leu a mensagem
    });
    
    await newMessage.save();
    
    // Notificar membros do grupo sobre a nova mensagem via socket
    group.members.forEach(memberId => {
      if (memberId.toString() !== senderId.toString()) {
        const receiverSocketId = getReceiverSocketId(memberId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newGroupMessage", {
                message: newMessage,
                group: {
                  _id: group._id,
                  name: group.name
                }
              });
            }
          }
        });
        
        res.status(201).json(newMessage);
      } catch (error) {
        console.error("Erro ao enviar mensagem de grupo:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Obter mensagens de um grupo
    export const getGroupMessages = async (req, res) => {
      try {
        const { id: groupId } = req.params;
        const userId = req.user._id;
        
        // Verificar se o usuário é membro do grupo
        const group = await Group.findOne({
          _id: groupId,
          members: { $in: [userId] }
        });
        
        if (!group) {
          return res.status(403).json({ error: "Você não é membro deste grupo" });
        }
        
        // Obter as mensagens do grupo
        const messages = await GroupMessage.find({
          groupId
        }).sort({ createdAt: 1 })
          .populate("senderId", "fullName profilePic");
        
        res.status(200).json(messages);
      } catch (error) {
        console.error("Erro ao obter mensagens do grupo:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Marcar mensagens como lidas
    export const markGroupMessagesAsRead = async (req, res) => {
      try {
        const { id: groupId } = req.params;
        const userId = req.user._id;
        
        // Verificar se o usuário é membro do grupo
        const group = await Group.findOne({
          _id: groupId,
          members: { $in: [userId] }
        });
        
        if (!group) {
          return res.status(403).json({ error: "Você não é membro deste grupo" });
        }
        
        // Encontrar mensagens que o usuário ainda não leu
        const messagesToUpdate = await GroupMessage.find({
          groupId,
          'read.userId': { $ne: userId }
        });
        
        // Adicionar o usuário à lista de leitores de cada mensagem
        for (const message of messagesToUpdate) {
          message.read.push({ userId, readAt: new Date() });
          await message.save();
        }
        
        res.status(200).json({ success: true, count: messagesToUpdate.length });
      } catch (error) {
        console.error("Erro ao marcar mensagens como lidas:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Adicionar membros a um grupo
    export const addGroupMembers = async (req, res) => {
      try {
        const { id: groupId } = req.params;
        const { members } = req.body; // Array de IDs de usuários a adicionar
        const userId = req.user._id;
        
        // Verificar se o usuário é o criador do grupo
        const group = await Group.findOne({
          _id: groupId,
          createdBy: userId
        });
        
        if (!group) {
          return res.status(403).json({ error: "Acesso negado ou grupo não encontrado" });
        }
        
        // Filtrar membros já existentes
        const newMembers = members.filter(m => !group.members.includes(m));
        
        if (newMembers.length > 0) {
          group.members.push(...newMembers);
          await group.save();
          
          // Notificar novos membros
          newMembers.forEach(memberId => {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
              io.to(memberSocketId).emit("addedToGroup", group);
            }
          });
        }
        
        res.status(200).json(group);
      } catch (error) {
        console.error("Erro ao adicionar membros:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Remover membro de um grupo
    export const removeGroupMember = async (req, res) => {
      try {
        const { groupId, memberId } = req.params;
        const userId = req.user._id;
        
        // Verificar se o usuário é o criador do grupo
        const group = await Group.findOne({
          _id: groupId,
          createdBy: userId
        });
        
        if (!group) {
          return res.status(403).json({ error: "Acesso negado ou grupo não encontrado" });
        }
        
        // Não permitir remover o criador
        if (memberId === group.createdBy.toString()) {
          return res.status(400).json({ error: "Não é possível remover o criador do grupo" });
        }
        
        // Remover o membro
        group.members = group.members.filter(m => m.toString() !== memberId);
        await group.save();
        
        // Notificar o membro removido
        const memberSocketId = getReceiverSocketId(memberId);
        if (memberSocketId) {
          io.to(memberSocketId).emit("removedFromGroup", { groupId });
        }
        
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Erro ao remover membro:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Sair de um grupo
    export const leaveGroup = async (req, res) => {
      try {
        const { id: groupId } = req.params;
        const userId = req.user._id;
        
        const group = await Group.findById(groupId);
        
        if (!group) {
          return res.status(404).json({ error: "Grupo não encontrado" });
        }
        
        // Verificar se o usuário é o criador
        if (group.createdBy.toString() === userId.toString()) {
          return res.status(400).json({ error: "O criador não pode sair do grupo, deve deletá-lo" });
        }
        
        // Verificar se o usuário é membro
        if (!group.members.includes(userId)) {
          return res.status(400).json({ error: "Você não é membro deste grupo" });
        }
        
        // Remover o usuário dos membros
        group.members = group.members.filter(m => m.toString() !== userId.toString());
        await group.save();
        
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Erro ao sair do grupo:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };
    
    // Deletar um grupo (apenas o criador)
    export const deleteGroup = async (req, res) => {
      try {
        const { id: groupId } = req.params;
        const userId = req.user._id;
        
        // Verificar se o usuário é o criador
        const group = await Group.findOne({
          _id: groupId,
          createdBy: userId
        });
        
        if (!group) {
          return res.status(403).json({ error: "Acesso negado ou grupo não encontrado" });
        }
        
        // Notificar membros sobre a exclusão
        group.members.forEach(memberId => {
          if (memberId.toString() !== userId.toString()) {
            const memberSocketId = getReceiverSocketId(memberId);
            if (memberSocketId) {
              io.to(memberSocketId).emit("groupDeleted", { groupId });
            }
          }
        });
        
        // Remover mensagens do grupo
        await GroupMessage.deleteMany({ groupId });
        
        // Remover o grupo
        await Group.findByIdAndDelete(groupId);
        
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Erro ao deletar grupo:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    };