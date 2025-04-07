// controllers/group.controller.js
import Group from "../models/group.model.js";
import GroupMessage from "../models/groupMessage.model.js";
import User from "../models/user.model.js"; // Added User model import
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
    
    // Populating members for the response
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members", "fullName profilePic email");
    
    // Notificar membros sobre o novo grupo via socket
    members.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("newGroup", populatedGroup);
      }
    });
    
    res.status(201).json(populatedGroup);
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
    
    // Verify group membership
    const group = await Group.findOne({
      _id: groupId,
      members: { $in: [senderId] }
    });
    
    if (!group) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }
    
    // Handle image upload
    let imageUrl;
    if (image && image.startsWith('data:')) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "auto",
        chunk_size: 6000000,
        timeout: 120000
      });
      imageUrl = uploadResponse.secure_url;
    }
    
    // Handle file upload
    let fileData = null;
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
        name: file.name || "file"
      };
    }
    
    // Create message
    const newMessage = new GroupMessage({
      groupId,
      senderId,
      text,
      image: imageUrl,
      file: fileData,
      read: [{ userId: senderId }] // Sender has read the message
    });
    
    await newMessage.save();
    
    // Populate sender info
    const populatedMessage = await GroupMessage.findById(newMessage._id)
      .populate("senderId", "fullName profilePic email");
    
    // Group room name for socket
    const roomName = `group-${groupId}`;
    
    // Emit to all members in the group room
    io.to(roomName).emit("newGroupMessage", {
      message: populatedMessage,
      group: {
        _id: group._id,
        name: group.name
      }
    });
    
    console.log(`Message sent to group room ${roomName}`);
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ error: "Internal server error" });
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
      .populate("senderId", "fullName profilePic email");
    
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
    
    // Verificar se o array de membros é válido
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "Lista de membros inválida" });
    }
    
    // Verificar se o usuário é o criador do grupo
    const group = await Group.findOne({
      _id: groupId,
      createdBy: userId
    });
    
    if (!group) {
      return res.status(403).json({ error: "Acesso negado ou grupo não encontrado" });
    }
    
    // Verificar se os membros existem
    const existingUsers = await User.find({ _id: { $in: members } })
                                   .select("_id fullName email profilePic");
    
    if (existingUsers.length !== members.length) {
      return res.status(404).json({ error: "Um ou mais usuários não foram encontrados" });
    }
    
    // Filtrar membros já existentes
    const existingMemberIds = group.members.map(m => m.toString());
    const newMembers = members.filter(m => !existingMemberIds.includes(m.toString()));
    
    if (newMembers.length === 0) {
      return res.status(400).json({ error: "Todos os usuários já são membros do grupo" });
    }
    
    // Adicionar novos membros
    group.members.push(...newMembers);
    await group.save();
    
    // Buscar grupo atualizado com informações dos membros
    const updatedGroup = await Group.findById(groupId)
                                   .populate("members", "fullName email profilePic");
    
    // Notificar novos membros
    newMembers.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId);
      if (memberSocketId) {
        io.to(memberSocketId).emit("addedToGroup", {
          group: updatedGroup,
          message: `Você foi adicionado ao grupo "${group.name}"`
        });
      }
    });
    
    res.status(200).json({
      success: true,
      message: `${newMembers.length} novo(s) membro(s) adicionado(s) com sucesso`,
      group: updatedGroup
    });
  } catch (error) {
    console.error("Erro ao adicionar membros:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
    
// Remover membro de um grupo
export const removeGroupMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const userId = req.user._id;
    
    // Verificar se o usuário é o criador do grupo
    const group = await Group.findOne({
      _id: groupId,
      createdBy: userId
    }).populate("members", "fullName email profilePic");
    
    if (!group) {
      return res.status(403).json({ error: "Acesso negado ou grupo não encontrado" });
    }
    
    // Não permitir remover o criador
    if (memberId === group.createdBy.toString()) {
      return res.status(400).json({ error: "Não é possível remover o criador do grupo" });
    }
    
    // Verificar se o membro existe no grupo
    const memberExists = group.members.some(m => 
      m._id.toString() === memberId || m.toString() === memberId
    );
    
    if (!memberExists) {
      return res.status(404).json({ error: "Membro não encontrado no grupo" });
    }
    
    // Encontrar informações do membro para notificação
    const memberInfo = group.members.find(m => 
      m._id.toString() === memberId || m.toString() === memberId
    );
    
    // Remover o membro
    group.members = group.members.filter(m => 
      typeof m === 'object' 
        ? m._id.toString() !== memberId 
        : m.toString() !== memberId
    );
    
    await group.save();
    
    // Buscar grupo atualizado com informações dos membros
    const updatedGroup = await Group.findById(groupId)
                                   .populate("members", "fullName email profilePic");
    
    // Notificar o membro removido
    const memberSocketId = getReceiverSocketId(memberId);
    if (memberSocketId) {
      io.to(memberSocketId).emit("removedFromGroup", { 
        groupId: group._id,
        groupName: group.name,
        message: `Você foi removido do grupo "${group.name}" pelo administrador`
      });
    }
    
    // Notificar outros membros
    group.members.forEach(m => {
      const currentMemberId = typeof m === 'object' ? m._id.toString() : m.toString();
      if (currentMemberId !== userId.toString()) {
        const currentMemberSocketId = getReceiverSocketId(currentMemberId);
        if (currentMemberSocketId) {
          io.to(currentMemberSocketId).emit("memberRemovedFromGroup", {
            groupId: group._id,
            removedUserId: memberId,
            removedUserName: memberInfo?.fullName || "Um membro",
            message: `${memberInfo?.fullName || "Um membro"} foi removido do grupo`
          });
        }
      }
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Membro removido com sucesso",
      updatedGroup: updatedGroup
    });
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
    
    // Verificar se o grupo existe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Verificar se o usuário é o criador
    if (group.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ error: "O criador não pode sair do grupo, deve deletá-lo" });
    }
    
    // Verificar se o usuário é membro
    const isMember = group.members.some(m => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(400).json({ error: "Você não é membro deste grupo" });
    }
    
    // Informações do membro para notificação
    const memberInfo = await User.findById(userId).select("fullName");
    
    // Remover o usuário dos membros
    group.members = group.members.filter(m => m.toString() !== userId.toString());
    await group.save();
    
    // Notificar outros membros
    group.members.forEach(memberId => {
      const memberSocketId = getReceiverSocketId(memberId.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("groupMemberLeft", {
          groupId: group._id,
          userId: userId,
          userName: memberInfo?.fullName || "Um membro",
          groupName: group.name,
          message: `${memberInfo?.fullName || "Um membro"} saiu do grupo`
        });
      }
    });
    
    res.status(200).json({ success: true, message: "Você saiu do grupo com sucesso" });
  } catch (error) {
    console.error("Erro ao sair do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Excluir um grupo
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
    
    // Guardar informações dos membros para notificação
    const memberIds = [...group.members];
    const groupName = group.name;
    
    // Notificar membros sobre a exclusão
    memberIds.forEach(memberId => {
      if (memberId.toString() !== userId.toString()) {
        const memberSocketId = getReceiverSocketId(memberId.toString());
        if (memberSocketId) {
          io.to(memberSocketId).emit("groupDeleted", { 
            groupId,
            groupName,
            message: `O grupo "${groupName}" foi excluído pelo administrador`
          });
        }
      }
    });
    
    // Remover mensagens do grupo
    await GroupMessage.deleteMany({ groupId });
    
    // Remover o grupo
    await Group.findByIdAndDelete(groupId);
    
    res.status(200).json({ success: true, message: "Grupo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};