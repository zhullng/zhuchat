import Transfer from "../models/transfer.model.js";
import User from "../models/user.model.js";
import { generateQRCode } from "../utils/qrCode.js";

// Transferir por email
export const createTransfer = async (req, res) => {
  try {
    const { receiverEmail, amount } = req.body;
    const senderId = req.user._id;

    // Verificar se o valor é válido
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Montante inválido" });
    }

    // Encontrar o destinatário pelo email
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ message: "Destinatário não encontrado" });
    }

    // Não permitir transferências para si mesmo
    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: "Não pode transferir para si mesmo" });
    }

    // Verificar se o remetente tem saldo suficiente
    const sender = await User.findById(senderId);
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Saldo insuficiente" });
    }

    // Criar transferência
    const transfer = new Transfer({
      sender: senderId,
      receiver: receiver._id,
      amount,
      status: "completed"
    });

    await transfer.save();

    // Atualizar saldos
    await User.findByIdAndUpdate(senderId, { $inc: { balance: -amount } });
    await User.findByIdAndUpdate(receiver._id, { $inc: { balance: amount } });

    res.status(201).json({
      message: "Transferência concluída com sucesso",
      transfer
    });
  } catch (error) {
    console.log("Error in createTransfer controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Obter histórico de transferências
export const getTransferHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const transfers = await Transfer.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .sort({ createdAt: -1 })
      .populate("sender", "fullName email")
      .populate("receiver", "fullName email");

    res.status(200).json(transfers);
  } catch (error) {
    console.log("Error in getTransferHistory controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Transferir por QR Code
export const transferByQRCode = async (req, res) => {
  try {
    const { qrData, amount } = req.body;
    const senderId = req.user._id;

    // Verificar se o valor é válido
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Montante inválido" });
    }

    // Descodificar QR para obter ID do destinatário
    const receiverId = qrData;

    // Verificar se o destinatário existe
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Destinatário não encontrado" });
    }

    // Não permitir transferências para si mesmo
    if (receiver._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: "Não pode transferir para si mesmo" });
    }

    // Verificar se o remetente tem saldo suficiente
    const sender = await User.findById(senderId);
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Saldo insuficiente" });
    }

    // Criar transferência
    const transfer = new Transfer({
      sender: senderId,
      receiver: receiverId,
      amount,
      status: "completed"
    });

    await transfer.save();

    // Atualizar saldos
    await User.findByIdAndUpdate(senderId, { $inc: { balance: -amount } });
    await User.findByIdAndUpdate(receiverId, { $inc: { balance: amount } });

    res.status(201).json({
      message: "Transferência via QR Code concluída com sucesso",
      transfer
    });
  } catch (error) {
    console.log("Error in transferByQRCode controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Gerar QR Code para o utilizador
export const generateUserQRCode = async (req, res) => {
  try {
    const userId = req.user._id;

    // Gerar QR code com o ID do utilizador
    const qrCode = await generateQRCode(userId.toString());

    res.status(200).json({ qrCode });
  } catch (error) {
    console.log("Error in generateUserQRCode controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};