import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// 🔹 FAZER TRANSFERÊNCIA
// 🔹 FAZER TRANSFERÊNCIA
export const makeTransfer = async (req, res) => {
  const { receiverEmail, amount } = req.body;
  const senderId = req.user._id; // Usuário autenticado (remetente)

  try {
    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: "Dados inválidos para transferência" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findOne({ email: receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // Atualizar saldo
    sender.balance -= Number(amount);
    receiver.balance += Number(amount);
    await sender.save();
    await receiver.save();

    // Criar a transferência
    const transfer = new Transfer({ sender: sender._id, receiver: receiver._id, amount });
    await transfer.save();

    res.json({ message: "Transferência realizada com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar a transferência" });
  }
};



// 🔹 HISTÓRICO DE TRANSFERÊNCIAS
export const getTransferHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const transfers = await Transfer.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).populate("sender receiver", "fullName email");

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar histórico de transferências" });
  }
};


export const depositMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const user = await User.findById(userId);
    user.balance += Number(amount);
    await user.save();

    res.json({ message: "Depósito realizado com sucesso!", balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar depósito" });
  }
};


export const withdrawMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    const user = await User.findById(userId);
    if (user.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    user.balance -= Number(amount);
    await user.save();

    res.json({ message: "Saque realizado com sucesso!", balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar saque" });
  }
};
