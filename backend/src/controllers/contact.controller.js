import Contact from "../models/contact.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// Adicionar um contacto por email
export const addContact = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user._id; // Assumindo que tem o middleware de autenticação

    // Verificar se o email foi fornecido
    if (!email) {
      return res.status(400).json({ error: "É necessário fornecer um email." });
    }

    // Procurar o utilizador pelo email
    const contactUser = await User.findOne({ email });
    if (!contactUser) {
      return res.status(404).json({ error: "Utilizador não encontrado com este email." });
    }

    // Verificar se o utilizador está a tentar adicionar-se a si mesmo
    if (contactUser._id.toString() === userId.toString()) {
      return res.status(400).json({ error: "Não pode adicionar-se a si mesmo como contacto." });
    }

    // Verificar se um dos utilizadores bloqueou o outro
    const blockExists = await Contact.findOne({
      $or: [
        { userId, contactId: contactUser._id, status: "blocked" },
        { userId: contactUser._id, contactId: userId, status: "blocked" }
      ]
    });

    if (blockExists) {
      // Se o utilizador atual bloqueou o contacto
      if (blockExists.userId.toString() === userId.toString()) {
        return res.status(400).json({ 
          error: "Não pode adicionar este utilizador pois tem-no bloqueado. Desbloqueie-o primeiro." 
        });
      } 
      // Se o contacto bloqueou o utilizador atual
      else {
        return res.status(400).json({ 
          error: "Não pode adicionar este utilizador pois ele bloqueou-o." 
        });
      }
    }

    // Verificar se já existe um contacto ativo entre estes utilizadores
    // Só consideramos contactos ativos (aceites ou pendentes, não rejeitados)
    const existingContact = await Contact.findOne({
      $or: [
        { userId, contactId: contactUser._id, status: { $in: ["accepted", "pending"] } },
        { userId: contactUser._id, contactId: userId, status: { $in: ["accepted", "pending"] } }
      ]
    });

    if (existingContact) {
      // Se já existe e está aceite
      if (existingContact.status === "accepted") {
        return res.status(400).json({ error: "Este utilizador já é seu contacto." });
      }
      // Se já existe e está pendente
      else if (existingContact.status === "pending") {
        return res.status(400).json({ error: "Já existe um pedido de contacto pendente para este utilizador." });
      }
    }

    // Verificar se existe um contato rejeitado e removê-lo se existir
    await Contact.deleteOne({
      $or: [
        { userId, contactId: contactUser._id, status: "rejected" },
        { userId: contactUser._id, contactId: userId, status: "rejected" }
      ]
    });

    // Criar o novo contacto
    const newContact = new Contact({
      userId,
      contactId: contactUser._id,
      email: contactUser.email
    });

    // Guardar o contacto na base de dados
    await newContact.save();

    res.status(201).json({ 
      message: "Pedido de contacto enviado com sucesso", 
      contact: newContact 
    });
  } catch (error) {
    console.error("Erro ao adicionar contacto:", error);
    res.status(500).json({ error: "Erro ao adicionar contacto." });
  }
};

// Listar contactos (apenas aceites)
export const getContacts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar contactos que o utilizador adicionou e foram aceites
    const sentContacts = await Contact.find({
      userId,
      status: "accepted"
    }).populate("contactId", "fullName email profilePic");

    // Buscar contactos onde o utilizador foi adicionado e aceitou
    const receivedContacts = await Contact.find({
      contactId: userId,
      status: "accepted"
    }).populate("userId", "fullName email profilePic");

    // Formatar os contactos para um formato uniforme
    const contacts = [
      ...sentContacts.map(contact => ({
        _id: contact._id,
        user: contact.contactId,
        note: contact.note,
        createdAt: contact.createdAt
      })),
      ...receivedContacts.map(contact => ({
        _id: contact._id,
        user: contact.userId,
        note: contact.note,
        createdAt: contact.createdAt
      }))
    ];

    res.status(200).json(contacts);
  } catch (error) {
    console.error("Erro ao obter contactos:", error);
    res.status(500).json({ error: "Erro ao obter contactos." });
  }
};

// Obter pedidos de contacto pendentes
export const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar pedidos pendentes enviados para o utilizador
    const pendingRequests = await Contact.find({
      contactId: userId,
      status: "pending"
    }).populate("userId", "fullName email profilePic");

    res.status(200).json(pendingRequests);
  } catch (error) {
    console.error("Erro ao obter pedidos pendentes:", error);
    res.status(500).json({ error: "Erro ao obter pedidos pendentes." });
  }
};

// Aceitar ou rejeitar um pedido de contacto
export const respondToRequest = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { status } = req.body; // "accepted" ou "rejected"
    const userId = req.user._id;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Estado inválido. Use 'accepted' ou 'rejected'." });
    }

    // Encontrar o pedido de contacto
    const contact = await Contact.findOne({
      _id: contactId,
      contactId: userId,
      status: "pending"
    });

    if (!contact) {
      return res.status(404).json({ error: "Pedido de contacto não encontrado." });
    }

    // Atualizar o estado do contacto
    contact.status = status;
    await contact.save();

    res.status(200).json({ 
      message: `Pedido de contacto ${status === "accepted" ? "aceite" : "rejeitado"} com sucesso.`,
      contact
    });
  } catch (error) {
    console.error("Erro ao responder ao pedido de contacto:", error);
    res.status(500).json({ error: "Erro ao responder ao pedido de contacto." });
  }
};

// Remover um contacto
export const removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user._id;

    // Encontrar e remover o contacto (seja onde for o utilizador principal ou o contacto)
    const deletedContact = await Contact.findOneAndDelete({
      _id: contactId,
      $or: [
        { userId },
        { contactId: userId }
      ]
    });

    if (!deletedContact) {
      return res.status(404).json({ error: "Contacto não encontrado." });
    }

    res.status(200).json({ message: "Contacto removido com sucesso." });
  } catch (error) {
    console.error("Erro ao remover contacto:", error);
    res.status(500).json({ error: "Erro ao remover contacto." });
  }
};

// Atualizar nota do contacto
export const updateContactNote = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { note } = req.body;
    const userId = req.user._id;

    const contact = await Contact.findOneAndUpdate(
      {
        _id: contactId,
        $or: [
          { userId },
          { contactId: userId }
        ]
      },
      { note },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: "Contacto não encontrado." });
    }

    res.status(200).json({ 
      message: "Nota atualizada com sucesso.",
      contact
    });
  } catch (error) {
    console.error("Erro ao atualizar nota do contacto:", error);
    res.status(500).json({ error: "Erro ao atualizar nota do contacto." });
  }
};

// Bloquear um utilizador
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    console.log("Request to block user:", { 
      blockingUser: currentUserId.toString(), 
      userToBlock: userId 
    });

    // Verificar se o ID do utilizador a bloquear é válido
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID de utilizador inválido." });
    }

    // Verificar se o utilizador a ser bloqueado existe
    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ error: "Utilizador a bloquear não encontrado." });
    }

    // Verificar se o utilizador está a tentar bloquear-se a si mesmo
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: "Não pode bloquear-se a si mesmo." });
    }

    // Verificar se o utilizador já está bloqueado
    const alreadyBlocked = await Contact.findOne({
      userId: currentUserId,
      contactId: userId,
      status: "blocked"
    });

    if (alreadyBlocked) {
      return res.status(400).json({ error: "Este utilizador já está bloqueado." });
    }

    // Primeiro, verificar se já existe um contacto entre os utilizadores
    const existingContact = await Contact.findOne({
      $or: [
        { userId: currentUserId, contactId: userId },
        { userId, contactId: currentUserId }
      ]
    });

    console.log("Existing contact check:", existingContact);

    // Se existir, remover o contacto existente
    if (existingContact) {
      await Contact.deleteOne({ _id: existingContact._id });
      console.log("Deleted existing contact:", existingContact._id);
    }

    // Criar um novo registo de bloqueio
    const blockedContact = new Contact({
      userId: currentUserId,
      contactId: userId,
      email: userToBlock.email, // Incluir email do usuário bloqueado
      status: "blocked"
    });

    console.log("Creating blocked contact:", blockedContact);
    
    await blockedContact.save();
    console.log("Successfully saved blocked contact");

    res.status(200).json({ 
      message: "Utilizador bloqueado com sucesso.",
      blockedContact
    });
  } catch (error) {
    console.error("Erro ao bloquear utilizador:", error);
    // Log detalhado do erro
    if (error.name && error.message) {
      console.error(`${error.name}: ${error.message}`);
    }
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    res.status(500).json({ error: "Erro ao bloquear utilizador." });
  }
};

// Obter utilizadores bloqueados
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar contactos com status "blocked"
    const blockedContacts = await Contact.find({
      userId,
      status: "blocked"
    }).populate("contactId", "fullName email profilePic");

    // Formatamos a resposta para retornar apenas os dados dos utilizadores bloqueados
    const blockedUsers = blockedContacts.map(contact => ({
      _id: contact.contactId._id,
      fullName: contact.contactId.fullName,
      email: contact.contactId.email,
      profilePic: contact.contactId.profilePic,
      blockedAt: contact.createdAt
    }));

    res.status(200).json(blockedUsers);
  } catch (error) {
    console.error("Erro ao obter utilizadores bloqueados:", error);
    res.status(500).json({ error: "Erro ao obter utilizadores bloqueados." });
  }
};

// Desbloquear um utilizador
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Encontrar e remover o registo de bloqueio
    const blockedContact = await Contact.findOneAndDelete({
      userId: currentUserId,
      contactId: userId,
      status: "blocked"
    });

    if (!blockedContact) {
      return res.status(404).json({ error: "Registo de bloqueio não encontrado." });
    }

    res.status(200).json({ message: "Utilizador desbloqueado com sucesso." });
  } catch (error) {
    console.error("Erro ao desbloquear utilizador:", error);
    res.status(500).json({ error: "Erro ao desbloquear utilizador." });
  }
};