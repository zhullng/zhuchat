import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

// Criar novo grupo
export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const userId = req.user._id;

    // Validação básica
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do grupo é obrigatório' });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um membro para o grupo' });
    }

    // Verificar se os membros existem
    const validMembers = await User.find({
      _id: { $in: members }
    });

    if (validMembers.length !== members.length) {
      return res.status(400).json({ error: 'Um ou mais membros selecionados não são válidos' });
    }

    // Criar o grupo (incluindo o próprio criador como membro)
    const allMembers = [...members, userId];
    
    const newGroup = new Group({
      name: name.trim(),
      members: allMembers,
      adminId: userId
    });

    await newGroup.save();

    // Criar mensagem de sistema sobre a criação do grupo
    const systemMessage = new Message({
      senderId: userId,
      groupId: newGroup._id,
      text: `${req.user.fullName} criou o grupo "${name.trim()}"`,
      isSystemMessage: true,
      readBy: [userId]
    });

    await systemMessage.save();

    // Carregar informações completas do grupo
    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', 'fullName email profilePic')
      .populate('adminId', 'fullName email');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
};

// Obter todos os grupos do usuário
export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar todos os grupos onde o usuário é membro
    const groups = await Group.find({ members: userId })
      .populate('members', 'fullName email profilePic')
      .populate('adminId', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    res.status(500).json({ error: 'Erro ao buscar grupos' });
  }
};

// Obter detalhes de um grupo específico
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verificar se o grupo existe e se o usuário é membro
    const group = await Group.findOne({ _id: groupId, members: userId })
      .populate('members', 'fullName email profilePic')
      .populate('adminId', 'fullName email');

    if (!group) {
      return res.status(404).json({ error: 'Grupo não encontrado ou você não tem acesso' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do grupo' });
  }
};

// Atualizar nome do grupo
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do grupo é obrigatório' });
    }

    // Verificar se o usuário é admin do grupo
    const isAdmin = await Group.isAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas o administrador pode atualizar o grupo' });
    }

    // Atualizar o nome do grupo
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { name: name.trim() },
      { new: true }
    ).populate('members', 'fullName email profilePic')
      .populate('adminId', 'fullName email');

    if (!updatedGroup) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Criar mensagem de sistema sobre a mudança de nome
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      text: `${req.user.fullName} alterou o nome do grupo para "${name.trim()}"`,
      isSystemMessage: true,
      readBy: [userId]
    });

    await systemMessage.save();

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Erro ao atualizar grupo:', error);
    res.status(500).json({ error: 'Erro ao atualizar grupo' });
  }
};

// Adicionar membro ao grupo
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const userId = req.user._id;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'O email do novo membro é obrigatório' });
    }

    // Verificar se o usuário é admin do grupo
    const isAdmin = await Group.isAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas o administrador pode adicionar membros' });
    }

    // Verificar se o grupo existe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Buscar o usuário pelo email
    const newMember = await User.findOne({ email: email.trim() });
    if (!newMember) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se o usuário já é membro
    if (group.members.includes(newMember._id)) {
      return res.status(400).json({ error: 'Este usuário já é membro do grupo' });
    }

    // Adicionar o usuário ao grupo
    group.members.push(newMember._id);
    await group.save();

    // Criar mensagem de sistema sobre o novo membro
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      text: `${req.user.fullName} adicionou ${newMember.fullName} ao grupo`,
      isSystemMessage: true,
      readBy: [userId]
    });

    await systemMessage.save();

    // Retornar grupo atualizado
    const updatedGroup = await Group.findById(groupId)
      .populate('members', 'fullName email profilePic')
      .populate('adminId', 'fullName email');

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    res.status(500).json({ error: 'Erro ao adicionar membro ao grupo' });
  }
};

// Remover membro do grupo
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    // Verificar se o usuário é admin do grupo
    const isAdmin = await Group.isAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas o administrador pode remover membros' });
    }

    // Verificar se o grupo existe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Não permitir remover o admin
    if (group.adminId.toString() === memberId) {
      return res.status(400).json({ error: 'O administrador não pode ser removido do grupo' });
    }

    // Buscar o membro a ser removido
    const member = await User.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Membro não encontrado' });
    }

    // Verificar se o usuário é membro do grupo
    if (!group.members.includes(memberId)) {
      return res.status(400).json({ error: 'Este usuário não é membro do grupo' });
    }

    // Remover o membro do grupo
    group.members = group.members.filter(id => id.toString() !== memberId);
    await group.save();

    // Criar mensagem de sistema sobre a remoção
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      text: `${req.user.fullName} removeu ${member.fullName} do grupo`,
      isSystemMessage: true,
      readBy: [userId]
    });

    await systemMessage.save();

    res.status(200).json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({ error: 'Erro ao remover membro do grupo' });
  }
};

// Sair do grupo
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verificar se o grupo existe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    // Verificar se o usuário é membro do grupo
    if (!group.members.includes(userId)) {
      return res.status(400).json({ error: 'Você não é membro deste grupo' });
    }

    // Se o usuário for o admin e houver outros membros, transferir admin
    if (group.adminId.toString() === userId.toString() && group.members.length > 1) {
      // Encontrar outro membro para se tornar admin
      const newAdminId = group.members.find(id => id.toString() !== userId.toString());
      
      group.adminId = newAdminId;
      
      // Criar mensagem sobre transferência de admin
      const transferMessage = new Message({
        senderId: userId,
        groupId: groupId,
        text: `${req.user.fullName} transferiu a administração do grupo`,
        isSystemMessage: true,
        readBy: [userId]
      });
      
      await transferMessage.save();
    } 
    // Se o admin estiver saindo e não há outros membros, excluir o grupo
    else if (group.adminId.toString() === userId.toString() && group.members.length <= 1) {
      await Group.findByIdAndDelete(groupId);
      await Message.deleteMany({ groupId: groupId });
      
      return res.status(200).json({ message: 'Grupo excluído com sucesso' });
    }

    // Remover o usuário do grupo
    group.members = group.members.filter(id => id.toString() !== userId.toString());
    await group.save();

    // Criar mensagem de sistema sobre a saída
    const systemMessage = new Message({
      senderId: userId,
      groupId: groupId,
      text: `${req.user.fullName} saiu do grupo`,
      isSystemMessage: true,
      readBy: [userId]
    });

    await systemMessage.save();

    res.status(200).json({ message: 'Você saiu do grupo com sucesso' });
  } catch (error) {
    console.error('Erro ao sair do grupo:', error);
    res.status(500).json({ error: 'Erro ao sair do grupo' });
  }
};

// Excluir grupo (apenas admin)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Verificar se o usuário é admin do grupo
    const isAdmin = await Group.isAdmin(groupId, userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Apenas o administrador pode excluir o grupo' });
    }

    // Excluir o grupo e todas as mensagens relacionadas
    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId: groupId });

    res.status(200).json({ message: 'Grupo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir grupo:', error);
    res.status(500).json({ error: 'Erro ao excluir grupo' });
  }
};