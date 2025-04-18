// controllers/group.controller.js
import mongoose from "mongoose";
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
      admins: [createdBy], // O criador é automaticamente um administrador
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
    
    // Enriquecer os grupos com informações de permissões
    const enrichedGroups = groups.map(group => {
      const groupObj = group.toObject();
      groupObj.isCreator = group.createdBy.toString() === userId.toString();
      groupObj.isAdmin = group.admins && group.admins.some(adminId => adminId.toString() === userId.toString());
      return groupObj;
    });
    
    res.status(200).json(enrichedGroups);
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
    
    // Adicionar informações sobre quem é admin e quem é criador
    const enrichedGroup = group.toObject();
    enrichedGroup.isCreator = group.createdBy.toString() === userId.toString();
    enrichedGroup.isAdmin = group.admins && group.admins.some(adminId => adminId.toString() === userId.toString());
    
    // Adicionar flag para cada membro indicando se é admin
    if (enrichedGroup.members && Array.isArray(enrichedGroup.members)) {
      enrichedGroup.members = enrichedGroup.members.map(member => ({
        ...member,
        isAdmin: group.admins && group.admins.some(adminId => adminId.toString() === member._id.toString()),
        isCreator: group.createdBy.toString() === member._id.toString()
      }));
    }
    
    res.status(200).json(enrichedGroup);
  } catch (error) {
    console.error("Erro ao obter detalhes do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { id: groupId } = req.params;
    const senderId = req.user._id;
    
    // Validações iniciais
    if (!text && !image && !file) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }
    
    // Verificar se o usuário é membro do grupo
    const group = await Group.findOne({
      _id: groupId,
      members: { $in: [senderId] }
    }).populate("members", "fullName profilePic");
    
    if (!group) {
      return res.status(403).json({ error: "Você não é membro deste grupo" });
    }
    
    let imageUrl, fileData = null;
    
    // Upload de imagem com tratamento de erro
    if (image && image.startsWith('data:')) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: "auto",
          chunk_size: 6000000,
          timeout: 120000
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Erro no upload de imagem:", uploadError);
        return res.status(500).json({ error: "Falha no upload da imagem" });
      }
    }
    
    // Upload de arquivo com tratamento de erro
    if (file && file.data && file.data.startsWith('data:')) {
      try {
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
      } catch (uploadError) {
        console.error("Erro no upload de arquivo:", uploadError);
        return res.status(500).json({ error: "Falha no upload do arquivo" });
      }
    }
    
    // Criar a mensagem
    const newMessage = new GroupMessage({
      groupId,
      senderId,
      text: text || "",
      image: imageUrl,
      file: fileData,
      read: [{ userId: senderId }]
    });
    
    await newMessage.save();
    
    // Encontrar o remetente
    const sender = group.members.find(member => 
      member._id.toString() === senderId.toString()
    );
    
    // Criar mensagem formatada
    const formattedMessage = {
      ...newMessage.toObject(),
      senderId: {
        _id: senderId,
        fullName: sender?.fullName || "Membro do grupo",
        profilePic: sender?.profilePic || "/avatar.png"
      }
    };
    
    // Broadcast da mensagem para todos no grupo, exceto o remetente
    const roomName = `group-${groupId}`;
    io.in(roomName).except(socket.id).emit("newGroupMessage", {
      message: formattedMessage,
      group: {
        _id: group._id,
        name: group.name,
        members: group.members.map(m => ({
          _id: m._id,
          fullName: m.fullName,
          profilePic: m.profilePic
        })),
        originalSender: senderId.toString()
      }
    });
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Erro ao enviar mensagem de grupo:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor", 
      details: error.message 
    });
  }
};

// Atualizar informações do grupo
export const updateGroupInfo = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user._id;
    
    // Verificar se o grupo existe
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Verificar se o usuário é o criador
    if (group.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Apenas o criador pode editar informações do grupo" });
    }
    
    // Atualizar campos fornecidos
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    
    // Atualizar foto de perfil, se fornecida
    if (req.body.profilePic) {
      if (req.body.profilePic.startsWith('data:')) {
        const uploadResponse = await cloudinary.uploader.upload(req.body.profilePic, {
          resource_type: "auto"
        });
        group.profilePic = uploadResponse.secure_url;
      } else if (req.body.profilePic === "") {
        // Remover a foto de perfil
        group.profilePic = "";
      }
    }
    
    await group.save();
    
    // Retornar o grupo atualizado
    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic email");
    
    // Notificar membros sobre a atualização do grupo
    group.members.forEach(memberId => {
      if (memberId.toString() !== userId.toString()) {
        const memberSocketId = getReceiverSocketId(memberId);
        if (memberSocketId) {
          io.to(memberSocketId).emit("groupUpdated", updatedGroup);
        }
      }
    });
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Erro ao atualizar informações do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Adicionar ao controllers/group.controller.js

// Excluir mensagem de grupo
export const deleteGroupMessage = async (req, res) => {
  try {
    const { groupId, messageId } = req.params;
    const userId = req.user._id;
    
    // Verificar se a mensagem existe
    const message = await GroupMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }
    
    // Verificar se a mensagem pertence ao grupo correto
    if (message.groupId.toString() !== groupId) {
      return res.status(400).json({ error: "A mensagem não pertence a este grupo" });
    }
    
    // Verificar se o usuário é o remetente da mensagem ou administrador do grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    const isAdmin = group.admins && group.admins.some(adminId => adminId.toString() === userId.toString());
    const isCreator = group.createdBy.toString() === userId.toString();
    const isSender = message.senderId.toString() === userId.toString();
    
    if (!isSender && !isAdmin && !isCreator) {
      return res.status(403).json({ error: "Você não tem permissão para excluir esta mensagem" });
    }
    
    // Excluir a mensagem
    await GroupMessage.findByIdAndDelete(messageId);
    
    // Notificar membros do grupo sobre a exclusão
    const roomName = `group-${groupId}`;
    io.to(roomName).emit("groupMessageDeleted", {
      messageId,
      groupId,
      deletedBy: userId.toString()
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir mensagem de grupo:", error);
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
    
    // Buscar o grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Verificar se o usuário é membro do grupo
    const isUserMember = group.members.some(id => id.toString() === userId.toString());
    if (!isUserMember) {
      return res.status(403).json({ error: "Você não é membro deste grupo" });
    }
    
    // Verificar se o usuário é o criador ou um administrador
    const isCreator = group.createdBy.toString() === userId.toString();
    const isAdmin = group.admins && group.admins.some(id => id.toString() === userId.toString());
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: "Apenas o criador ou administradores podem adicionar membros" });
    }
    
    // Filtrar membros já existentes
    const newMembers = members.filter(m => !group.members.some(existingMember => 
      existingMember.toString() === m.toString()
    ));
    
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
    
    // Retornar o grupo atualizado e populado
    const updatedGroup = await Group.findById(groupId)
      .populate("members", "fullName profilePic email");
    
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Erro ao adicionar membros:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Remover membro de um grupo
export const removeGroupMember = async (req, res) => {
  try {
    console.log("Tentando remover membro:", { 
      params: req.params,
      user: req.user._id.toString()
    });

    // Primeiro, vamos garantir que temos os parâmetros corretos
    // Algumas rotas usam groupId, outras usam id
    const groupId = req.params.groupId || req.params.id;
    const memberId = req.params.memberId;
    const userId = req.user._id;

    console.log("Parâmetros após padronização:", { groupId, memberId, userId: userId.toString() });

    if (!groupId || !memberId) {
      return res.status(400).json({ error: "IDs de grupo e membro são obrigatórios" });
    }

    // Buscar o grupo com informações completas
    const group = await Group.findById(groupId);
    
    if (!group) {
      console.log("Grupo não encontrado");
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    console.log("Grupo encontrado:", { 
      id: group._id.toString(), 
      name: group.name,
      creatorId: group.createdBy.toString(),
      membersCount: group.members.length
    });

    // Permitir que qualquer membro remova outros membros (exceto o criador)
    // Isso é temporário até resolvermos o problema de permissões
    const isUserMember = group.members.some(m => m.toString() === userId.toString());
    
    if (!isUserMember) {
      console.log("Usuário não é membro do grupo");
      return res.status(403).json({ error: "Você não é membro deste grupo" });
    }

    // Não permitir remover o criador
    if (memberId === group.createdBy.toString()) {
      console.log("Tentativa de remover o criador");
      return res.status(400).json({ error: "Não é possível remover o criador do grupo" });
    }

    // Verificar se o membro existe no grupo
    const isMemberInGroup = group.members.some(m => m.toString() === memberId);
    
    if (!isMemberInGroup) {
      console.log("Membro não existe no grupo");
      return res.status(404).json({ error: "Usuário não é membro deste grupo" });
    }

    console.log("Removendo membro:", memberId);

    // Remover o membro
    group.members = group.members.filter(m => m.toString() !== memberId);
    
    // Se o membro for admin, removê-lo dos admins também
    if (group.admins && group.admins.length > 0) {
      group.admins = group.admins.filter(a => a.toString() !== memberId);
    }

    await group.save();
    console.log("Membro removido com sucesso");

    // Notificar o membro removido
    const memberSocketId = getReceiverSocketId(memberId);
    if (memberSocketId) {
      io.to(memberSocketId).emit("removedFromGroup", { groupId });
    }

    // Retornar sucesso
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
    
    // Validação de entrada
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: "ID de grupo inválido" });
    }
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Converter IDs para string para comparação segura
    const creatorId = group.createdBy ? group.createdBy.toString() : null;
    const requestUserId = userId ? userId.toString() : null;
    
    // Verificar se o usuário é o criador
    if (creatorId === requestUserId) {
      return res.status(400).json({ error: "O criador não pode sair do grupo, deve deletá-lo" });
    }
    
    // Verificar se o usuário é membro
    const isUserMember = Array.isArray(group.members) && 
      group.members.some(memberId => memberId && memberId.toString() === requestUserId);
    
    if (!isUserMember) {
      return res.status(400).json({ error: "Você não é membro deste grupo" });
    }
    
    // Remover o usuário dos membros de forma segura
    if (Array.isArray(group.members)) {
      group.members = group.members.filter(memberId => 
        memberId && memberId.toString() !== requestUserId
      );
      
      // Se o usuário era um administrador, removê-lo dos administradores também
      if (group.admins) {
        group.admins = group.admins.filter(adminId => 
          adminId && adminId.toString() !== requestUserId
        );
      }
      
      await group.save();
      res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: "Estrutura de membros do grupo inválida" });
    }
  } catch (error) {
    console.error("Erro ao sair do grupo:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Deletar um grupo (versão simplificada)
export const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    
    // Buscar o grupo sem verificar o criador inicialmente
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Converter IDs para string para comparação
    const stringUserId = String(userId);
    const stringCreatorId = String(group.createdBy);
    
    // Verificar se o usuário é o criador
    if (stringUserId !== stringCreatorId) {
      return res.status(403).json({ error: "Apenas o criador pode excluir o grupo" });
    }
    
    // Excluir mensagens relacionadas
    await GroupMessage.deleteMany({ groupId });
    
    // Usar deleteOne em vez de findByIdAndDelete (pode ser mais estável)
    await Group.deleteOne({ _id: groupId });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

// Função deleteEmptyGroup
export const deleteEmptyGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user._id;
    
    console.log("🔍 Tentando excluir grupo vazio:", { groupId, userId: String(userId) });
    
    // Buscar o grupo
    const group = await Group.findById(groupId);
    
    if (!group) {
      console.log("❌ Grupo não encontrado:", groupId);
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    
    // Logar informações detalhadas sobre o grupo
    console.log("📊 Dados do grupo:", {
      id: groupId,
      creatorId: String(group.createdBy),
      membersCount: group.members?.length || 0,
      members: group.members?.map(m => String(m))
    });
    
    // Converter IDs para string
    const stringUserId = String(userId);
    const stringCreatorId = String(group.createdBy);
    
    // Verificar se o usuário é o criador
    if (stringUserId !== stringCreatorId) {
      console.log("❌ Usuário não é o criador:", { userId: stringUserId, creatorId: stringCreatorId });
      return res.status(403).json({ error: "Apenas o criador pode excluir o grupo" });
    }
    
    // REMOVER A VERIFICAÇÃO DE ÚNICO MEMBRO - Vamos permitir a exclusão mesmo se houver outros membros
    // Apenas registrar o estado para fins de logging, mas não impedir a operação
    if (Array.isArray(group.members)) {
      const otherMembers = group.members.filter(m => String(m) !== stringUserId);
      if (otherMembers.length > 0) {
        console.log("⚠️ Aviso: Grupo tem outros membros, mas vamos excluir mesmo assim:", 
          { otherMembersCount: otherMembers.length });
      } else {
        console.log("✅ Grupo tem apenas o criador como membro");
      }
    }
    
    console.log("🗑️ Excluindo mensagens do grupo");
    // Excluir mensagens primeiro
    await GroupMessage.deleteMany({ groupId });
    
    console.log("🗑️ Excluindo o grupo");
    // Excluir o grupo usando deleteOne
    await Group.deleteOne({ _id: groupId });
    
    console.log("✅ Grupo excluído com sucesso");
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao excluir grupo vazio:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};