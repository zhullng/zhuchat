import Contact from "../models/contact.model.js";
import User from "../models/user.model.js";

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

    // Verificar se já existe um contacto entre estes utilizadores
    const existingContact = await Contact.findOne({
      $or: [
        { userId, contactId: contactUser._id },
        { userId: contactUser._id, contactId: userId }
      ]
    });

    if (existingContact) {
      return res.status(400).json({ error: "Este utilizador já é seu contacto ou tem um pedido pendente." });
    }

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