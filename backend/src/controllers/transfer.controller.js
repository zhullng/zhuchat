import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const makeTransfer = async (req, res) => {
  const { receiverEmail, amount } = req.body;
  const senderId = req.user._id;

  try {
    // 1. Verificar se o valor é positivo e se o remetente tem saldo suficiente
    const sender = await User.findById(senderId);
    if (sender.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ error: 'Destinatário não encontrado' });
    }

    // Impedir transferência para si mesmo
    if (receiver._id.equals(senderId)) {
      return res.status(400).json({ error: 'Não é possível transferir para si mesmo' });
    }

    // 2. Criar a transferência
    const transfer = new Transfer({
      sender: senderId,
      receiver: receiver._id,
      amount,
    });

    // Salvar a transferência
    await transfer.save();

    // 3. Atualizar os saldos dos dois usuários
    sender.balance -= Number(amount);
    receiver.balance += Number(amount);

    await sender.save();
    await receiver.save();

    // 4. Emitir um evento via WebSocket para ambos os usuários
    // Obter o socketId do receptor para emitir o evento para ele
    const receiverSocketId = getReceiverSocketId(receiver._id);

    // Emitir para o sender e receiver
    io.to(receiverSocketId).emit('transfer-update', {
      senderId,
      receiverId: receiver._id,
      amount,
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      senderFullName: sender.fullName,
      receiverFullName: receiver.fullName,
      createdAt: transfer.createdAt,
    });

    // Emitir também para o sender
    io.to(senderId).emit('transfer-update', {
      senderId,
      receiverId: receiver._id,
      amount,
      senderBalance: sender.balance,
      receiverBalance: receiver.balance,
      senderFullName: sender.fullName,
      receiverFullName: receiver.fullName,
      createdAt: transfer.createdAt,
    });

    // 5. Retornar a resposta
    res.status(200).json({ message: 'Transferência realizada com sucesso', transfer });
  } catch (error) {
    console.error('Erro ao processar a transferência:', error);
    res.status(500).json({ error: 'Erro ao processar a transferência' });
  }
};

// 🔹 HISTÓRICO DE TRANSFERÊNCIAS
export const getTransferHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) return res.status(400).json({ error: "ID do usuário é obrigatório" });

    const transfers = await Transfer.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender receiver", "fullName email")
      .sort({ createdAt: -1 });

    res.json(transfers.length > 0 ? transfers : { message: "Nenhuma transferência encontrada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar histórico de transferências" });
  }
};

export const depositMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Valor inválido para depósito" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    user.balance += Number(amount); // Garantindo que ambos sejam números

    await user.save();

    res.json({
      message: "Depósito realizado com sucesso!",
      user: { fullName: user.fullName, balance: user.balance },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar depósito" });
  }
};

export const withdrawMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Valor inválido para saque" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    user.balance -= Number(amount); // Garantindo que ambos sejam números

    await user.save();

    res.json({
      message: "Saque realizado com sucesso!",
      user: { fullName: user.fullName, balance: user.balance },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar saque" });
  }
};
